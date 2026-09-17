const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('========================================================');
  console.log('🧪 RUNNING OFFLINE CASH FULL PIPELINE VERIFICATION');
  console.log('========================================================\n');

  try {
    // 1. Health check
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✓ [1/7] Backend Health Status:', health.data);

    // 3. Login assigned driver first to get their assigned bus
    const assignedDriverLogin = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'driver@platform.com',
      password: 'driver123',
      role: 'driver'
    });
    const assignedDriverToken = assignedDriverLogin.data.data?.token || assignedDriverLogin.data.token;
    const driverDash = await axios.get(`${BASE_URL}/driver/dashboard`, {
      headers: { Authorization: `Bearer ${assignedDriverToken}` }
    });

    const driverAssignedVehicle = driverDash.data.data.assignedVehicle;
    if (!driverAssignedVehicle) {
      throw new Error('Assigned driver does not have an assigned vehicle');
    }

    console.log(`✓ [2/7] Assigned Bus Identified: ${driverAssignedVehicle.vehicleName} (${driverAssignedVehicle.id})`);

    // 4. Authenticate Customer
    const customerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: '9876543210',
      password: 'password123',
      role: 'customer'
    }).catch(async () => {
      return await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Offline Test Customer',
        email: 'offlinecustomer@test.com',
        phone: '9876543210',
        password: 'password123',
        role: 'customer'
      });
    });

    const customerToken = customerLogin.data.data?.token || customerLogin.data.token;
    console.log('✓ [3/7] Customer Authenticated successfully');

    // Pick unique test seats
    const testSeat1 = 'C' + Math.floor(Math.random() * 800 + 100);
    const testSeat2 = 'C' + Math.floor(Math.random() * 800 + 100);

    // 5. Create an Offline Cash Booking on the driver's vehicle
    console.log(`\n--- Test Step A: Creating Offline Cash Booking on Vehicle ${driverAssignedVehicle.vehicleName} for seat ${testSeat1} ---`);
    const bookingPayload = {
      vehicleId: driverAssignedVehicle.id,
      serviceType: 'Bus',
      pickupLocation: 'Terminal A',
      dropLocation: 'Terminal B',
      passengerDetails: [
        { name: 'John Doe', age: 30, gender: 'Male', phone: '9876543210', seatNumber: testSeat1 }
      ],
      selectedSeats: [testSeat1],
      fare: 550,
      travelDate: new Date().toISOString(),
      paymentMethod: 'Offline Cash'
    };

    const bookingRes = await axios.post(`${BASE_URL}/bookings`, bookingPayload, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    const booking = bookingRes.data.data;
    console.log(`✓ Booking Created: ${booking.bookingId}`);
    console.log(`  - paymentMethod: "${booking.paymentMethod}" (Expected: "Offline Cash")`);
    console.log(`  - paymentStatus: "${booking.paymentStatus}" (Expected: "Pending Cash")`);
    console.log(`  - bookingStatus: "${booking.bookingStatus}" (Expected: "Confirmed")`);
    console.log(`  - cashCollected: ${booking.cashCollected} (Expected: false)`);

    if (booking.paymentMethod !== 'Offline Cash' || booking.paymentStatus !== 'Pending Cash' || booking.bookingStatus !== 'Confirmed') {
      throw new Error('Booking properties mismatch for Offline Cash creation!');
    }

    // 6. Test Seat Collision: Another booking attempting to reserve the same seat must be blocked
    console.log(`\n--- Test Step B: Verifying Seat Collision Protection on Seat ${testSeat1} ---`);
    try {
      await axios.post(`${BASE_URL}/bookings`, {
        vehicleId: driverAssignedVehicle.id,
        serviceType: 'Bus',
        pickupLocation: 'Terminal A',
        dropLocation: 'Terminal B',
        passengerDetails: [{ name: 'Jane Doe', age: 25, gender: 'Female', phone: '9876543211', seatNumber: testSeat1 }],
        selectedSeats: [testSeat1],
        fare: 550,
        travelDate: new Date().toISOString(),
        paymentMethod: 'Offline Cash'
      }, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      throw new Error('Seat collision check failed! Duplicate seat booking was allowed.');
    } catch (collisionErr) {
      if (collisionErr.response && collisionErr.response.status === 400) {
        console.log(`✓ Seat Collision Protection Verified: Received HTTP 400: "${collisionErr.response.data.message}"`);
      } else {
        throw collisionErr;
      }
    }

    // 7. Test Driver/Conductor Cash Collection
    console.log(`\n--- Test Step C: Conductor / Driver Cash Collection Flow ---`);

    // Login unassigned driver (Suresh Verma - assigned to EV-Sewa) to test cross-driver blocking
    console.log(`\n--- Test Step C.1: Testing Cross-Driver Security (Unassigned Driver must get 403) ---`);
    const unassignedDriverLogin = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'suresh.driver@platform.com',
      password: 'driver123',
      role: 'driver'
    });
    const unassignedDriverToken = unassignedDriverLogin.data.data?.token || unassignedDriverLogin.data.token;

    try {
      await axios.post(
        `${BASE_URL}/driver/bookings/${booking._id}/collect-cash`,
        {},
        { headers: { Authorization: `Bearer ${unassignedDriverToken}` } }
      );
      throw new Error('Security Breach! Unassigned driver was able to collect cash.');
    } catch (unauthErr) {
      if (unauthErr.response && unauthErr.response.status === 403) {
        console.log(`✓ Cross-Driver Security Verified: Received HTTP 403: "${unauthErr.response.data.message}"`);
      } else {
        throw unauthErr;
      }
    }

    // Now collect cash using ASSIGNED driver API
    console.log(`\n--- Test Step C.2: Authorized Conductor Collects Cash ---`);
    const collectRes = await axios.post(
      `${BASE_URL}/driver/bookings/${booking._id}/collect-cash`,
      {},
      { headers: { Authorization: `Bearer ${assignedDriverToken}` } }
    );

    const updatedBooking = collectRes.data.data.booking;
    console.log(`✓ Cash Collected Successfully:`);
    console.log(`  - paymentStatus: "${updatedBooking.paymentStatus}" (Expected: "Paid")`);
    console.log(`  - cashCollected: ${updatedBooking.cashCollected} (Expected: true)`);
    console.log(`  - cashCollectedAt: ${updatedBooking.cashCollectedAt}`);
    console.log(`  - cashCollectedBy: ${updatedBooking.cashCollectedBy}`);

    if (updatedBooking.paymentStatus !== 'Paid' || updatedBooking.cashCollected !== true) {
      throw new Error('PaymentStatus or cashCollected flag failed to update to Paid/true!');
    }

    // 7. Duplicate Cash Collection Protection
    console.log(`\n--- Test Step D: Duplicate Cash Collection Protection ---`);
    try {
      await axios.post(
        `${BASE_URL}/driver/bookings/${booking._id}/collect-cash`,
        {},
        { headers: { Authorization: `Bearer ${assignedDriverToken}` } }
      );
      throw new Error('Duplicate cash collection was allowed!');
    } catch (dupErr) {
      if (dupErr.response && dupErr.response.status === 400) {
        console.log(`✓ Duplicate Protection Verified: HTTP 400: "${dupErr.response.data.message}"`);
      } else {
        throw dupErr;
      }
    }

    // 8. Online Razorpay Regression Check
    console.log(`\n--- Test Step E: Online Razorpay Flow Regression Check ---`);
    const onlineBookingRes = await axios.post(`${BASE_URL}/bookings`, {
      vehicleId: driverAssignedVehicle.id,
      serviceType: 'Bus',
      pickupLocation: 'Terminal A',
      dropLocation: 'Terminal B',
      passengerDetails: [{ name: 'Online User', age: 28, gender: 'Male', phone: '9876543210', seatNumber: testSeat2 }],
      selectedSeats: [testSeat2],
      fare: 550,
      travelDate: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    const onlineBooking = onlineBookingRes.data.data;
    const rzpOrderRes = await axios.post(
      `${BASE_URL}/payments/razorpay/create-order`,
      { bookingId: onlineBooking._id },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );

    console.log(`✓ Razorpay Test Order Created: ${rzpOrderRes.data.data.orderId} for ₹${rzpOrderRes.data.data.amount / 100}`);

    const rzpTestPayRes = await axios.post(
      `${BASE_URL}/payments/razorpay/test-pay`,
      {
        bookingId: onlineBooking._id,
        razorpayOrderId: rzpOrderRes.data.data.orderId,
        status: 'success',
        method: 'UPI'
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );

    const rzpVerifyRes = await axios.post(
      `${BASE_URL}/payments/razorpay/verify-payment`,
      {
        bookingId: onlineBooking._id,
        razorpayOrderId: rzpTestPayRes.data.data.razorpayOrderId,
        razorpayPaymentId: rzpTestPayRes.data.data.razorpayPaymentId,
        razorpaySignature: rzpTestPayRes.data.data.razorpaySignature
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );

    console.log(`✓ Razorpay Online Payment Verified: ${rzpVerifyRes.data.data.payment.transactionId} (Status: ${rzpVerifyRes.data.data.booking.paymentStatus})`);

    console.log('\n========================================================');
    console.log('🎉 ALL OFFLINE CASH & ONLINE PAYMENT TESTS PASSED 100%!');
    console.log('========================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTest();
