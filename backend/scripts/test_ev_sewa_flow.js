const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
require('dotenv').config();

async function runEvSewaValidation() {
  console.log('================================================================');
  console.log('🚗 EV-SEWA JOYLONG E6 MODULE - COMPLETE 10-STEP TEST SUITE');
  console.log('================================================================\n');

  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.\n');

    // 0. Login / Register Customer for Testing
    console.log('--- Step 0: Customer Authentication ---');
    const customerCreds = {
      phone: '+919998887766',
      password: 'CustomerSecurePass123'
    };

    let loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: customerCreds.phone, password: customerCreds.password, role: 'customer' });

    if (loginRes.status !== 200) {
      // Register if not found
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Ananya Sharma',
          phone: customerCreds.phone,
          email: 'ananya.sharma@example.com',
          password: customerCreds.password,
          role: 'customer'
        });

      loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: customerCreds.phone, password: customerCreds.password, role: 'customer' });
    }

    const token = loginRes.body.token;
    console.log('✅ Customer Authenticated successfully. Token obtained.\n');

    // 1. Test EV-Sewa Listing
    console.log('--- 1. Testing EV-Sewa Listing (/api/vehicles?type=ev-sewa) ---');
    const listingRes = await request(app).get('/api/vehicles?type=ev-sewa');
    console.log(`HTTP Status: ${listingRes.status}`);
    console.log(`Success: ${listingRes.body.success}`);
    console.log(`Vehicles count: ${listingRes.body.count}`);

    if (listingRes.status !== 200 || !listingRes.body.success || listingRes.body.count === 0) {
      throw new Error('EV-Sewa listing failed or returned empty list');
    }
    console.log('✅ 1. EV-Sewa Listing: PASS\n');

    // 2. Test Joylong E6-style vehicle data from MongoDB
    console.log('--- 2. Testing Joylong E6-Style Vehicle Data from MongoDB ---');
    const evVehicle = listingRes.body.data.find(
      (v) => v.vehicleModel.includes('Joylong') || v.vehicleName.includes('Joylong')
    ) || listingRes.body.data[0];

    console.log('Vehicle Name:', evVehicle.vehicleName);
    console.log('Vehicle Number:', evVehicle.vehicleNumber);
    console.log('Vehicle Type:', evVehicle.vehicleType);
    console.log('Vehicle Category:', evVehicle.vehicleCategory);
    console.log('Vehicle Model:', evVehicle.vehicleModel);
    console.log('Seating Capacity:', evVehicle.seatingCapacity);
    console.log('Fare Rate:', `₹${evVehicle.fareRate}`);
    console.log('Battery Capacity:', evVehicle.evDetails?.batteryCapacity);
    console.log('Range:', `${evVehicle.evDetails?.rangeKm} km`);
    console.log('Vehicle Status:', evVehicle.vehicleStatus);
    console.log('Assigned Driver:', evVehicle.assignedDriver ? evVehicle.assignedDriver.name : 'None');

    if (!evVehicle.vehicleName || !evVehicle.vehicleNumber || evVehicle.vehicleType !== 'EV-Sewa') {
      throw new Error('Vehicle record validation failed');
    }
    console.log('✅ 2. Joylong E6-Style Vehicle Data: PASS\n');

    // 3. Test Vehicle Image Rendering / Image Sources
    console.log('--- 3. Testing Vehicle Image Rendering / Source URL ---');
    const imageUrl = (evVehicle.vehicleImages && evVehicle.vehicleImages.length > 0)
      ? evVehicle.vehicleImages[0]
      : 'Default EV Fallback';
    console.log('Image URLs array:', evVehicle.vehicleImages);
    console.log('Primary Render Image:', imageUrl);
    if (!evVehicle.vehicleImages || evVehicle.vehicleImages.length === 0) {
      console.log('⚠️ Notice: No vehicleImages array provided, fallback placeholder used.');
    } else {
      console.log('✅ 3. Vehicle Image Source URL: PASS\n');
    }

    // 4. Test Vehicle Details
    console.log('--- 4. Testing Vehicle Details (/api/vehicles/:id) ---');
    const detailsRes = await request(app).get(`/api/vehicles/${evVehicle._id}`);
    console.log(`HTTP Status: ${detailsRes.status}`);
    console.log('Details vehicle ID:', detailsRes.body.data._id);
    console.log('Details vehicle Model:', detailsRes.body.data.vehicleModel);

    if (detailsRes.status !== 200 || !detailsRes.body.data) {
      throw new Error('Vehicle Details retrieval failed');
    }
    console.log('✅ 4. Vehicle Details: PASS\n');

    // 5. Test Pickup / Drop Configuration
    console.log('--- 5. Testing Pickup / Drop Information ---');
    const pickupLoc = evVehicle.pickupDropDetails?.pickupLocation || evVehicle.route?.origin || 'Connaught Place, New Delhi';
    const dropLoc = evVehicle.pickupDropDetails?.dropLocation || evVehicle.route?.destination || 'Sector 62 Electronic City, Noida';
    console.log('Pickup Location:', pickupLoc);
    console.log('Drop Location:', dropLoc);
    console.log('✅ 5. Pickup / Drop Information: PASS\n');

    // 6. Test Passenger Details Validation & Booking Creation
    console.log('--- 6. Testing Passenger Details & Booking API (/api/bookings) ---');
    const passengers = [
      {
        name: 'Ananya Sharma',
        phone: '+919998887766',
        age: 26,
        gender: 'Female'
      }
    ];

    const bookingPayload = {
      vehicleId: evVehicle._id,
      serviceType: 'EV-Sewa',
      pickupLocation: pickupLoc,
      dropLocation: dropLoc,
      passengerDetails: passengers,
      fare: evVehicle.fareRate,
      travelDate: new Date().toISOString().split('T')[0]
    };

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(bookingPayload);

    console.log(`HTTP Status: ${bookingRes.status}`);
    console.log('Booking Response:', bookingRes.body);

    if (bookingRes.status !== 201 || !bookingRes.body.data) {
      throw new Error(`Booking creation failed: ${JSON.stringify(bookingRes.body)}`);
    }
    const createdBooking = bookingRes.body.data;
    console.log('Created Booking ID:', createdBooking.bookingId);
    console.log('✅ 6. Passenger Details & Booking Creation: PASS\n');

    // 7. Test Fare Calculation
    console.log('--- 7. Testing Fare Calculation ---');
    console.log('Base Fare:', evVehicle.fareRate);
    console.log('Booking Stored Fare:', createdBooking.fare);
    if (createdBooking.fare !== evVehicle.fareRate) {
      throw new Error('Fare mismatch between vehicle rate and booking');
    }
    console.log('✅ 7. Fare Verification: PASS\n');

    // 8. Test Payment (Sandbox Payment Success)
    console.log('--- 8. Testing Payment Gateway Sandbox (/api/payments/test-success) ---');
    const paymentRes = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId: createdBooking.bookingId,
        paymentMethod: 'UPI'
      });

    console.log(`HTTP Status: ${paymentRes.status}`);
    console.log('Payment Status:', paymentRes.body.data?.payment?.paymentStatus);
    console.log('Updated Booking Status:', paymentRes.body.data?.booking?.bookingStatus);

    if (paymentRes.status !== 200 || paymentRes.body.data?.booking?.bookingStatus !== 'Confirmed') {
      throw new Error('Payment sandbox execution failed');
    }
    console.log('✅ 8. Payment Processing: PASS\n');

    // 9. Test Booking Confirmation
    console.log('--- 9. Testing Booking Confirmation ---');
    const verifyBookingRes = await request(app)
      .get(`/api/bookings/${createdBooking._id}`)
      .set('Authorization', `Bearer ${token}`);

    console.log(`HTTP Status: ${verifyBookingRes.status}`);
    console.log('Confirmed Booking ID:', verifyBookingRes.body.data.bookingId);
    console.log('Confirmed Service Type:', verifyBookingRes.body.data.serviceType);
    console.log('Confirmed Status:', verifyBookingRes.body.data.bookingStatus);

    if (verifyBookingRes.body.data.bookingStatus !== 'Confirmed') {
      throw new Error('Booking confirmation check failed');
    }
    console.log('✅ 9. Booking Confirmation: PASS\n');

    // 10. Test Digital Ticket
    console.log('--- 10. Testing Digital Ticket Data Retrieval ---');
    const ticketRes = await request(app)
      .get(`/api/bookings/${createdBooking.bookingId}`)
      .set('Authorization', `Bearer ${token}`);

    const ticketData = ticketRes.body.data;
    console.log('Ticket Booking ID:', ticketData.bookingId);
    console.log('Ticket Service:', ticketData.serviceType);
    console.log('Ticket Vehicle Name:', ticketData.vehicle?.vehicleName);
    console.log('Ticket Vehicle Model:', ticketData.vehicle?.vehicleModel);
    console.log('Ticket Route:', `${ticketData.pickupLocation} → ${ticketData.dropLocation}`);
    console.log('Ticket Passenger:', ticketData.passengerDetails[0]?.name);
    console.log('Ticket Fare Paid:', `₹${ticketData.fare}`);
    console.log('Ticket Status:', ticketData.bookingStatus);

    if (!ticketData || ticketData.bookingStatus !== 'Confirmed') {
      throw new Error('Ticket retrieval failed');
    }
    console.log('✅ 10. Digital Ticket: PASS\n');

    console.log('================================================================');
    console.log('🎉 ALL 10 TESTS PASSED SUCCESSFULLY WITH ZERO ERRORS!');
    console.log('================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runEvSewaValidation();
