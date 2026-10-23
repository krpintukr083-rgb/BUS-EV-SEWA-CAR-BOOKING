const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const DRIVER_EMAIL = 'krpintukr083+driverreview@gmail.com';
const DRIVER_PASS = 'YatraDriver@Review26!';

// Helper function to query Expo Push Receipts
async function queryExpoReceipt(ticketId) {
  if (!ticketId || ticketId === 'N/A' || ticketId === 'OK') return { status: 'NO_TICKET_ID' };
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ ids: [ticketId] })
    });
    if (!res.ok) return { status: `HTTP_${res.status}` };
    const data = await res.json();
    return data.data?.[ticketId] || { status: 'PENDING_OR_NOT_FOUND' };
  } catch (err) {
    return { error: err.message };
  }
}

async function verifyAllScheduledServices() {
  console.log('================================================================');
  console.log('🚀 LIVE PRODUCTION VERIFICATION: SCHEDULED BOOKINGS (BUS, EV-SEWA, CAR)');
  console.log('================================================================');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to Database: ${mongoose.connection.name}`);

  require('../src/models/User');
  require('../src/models/Vehicle');
  const User = require('../src/models/User');
  const Driver = require('../src/models/Driver');
  const Vehicle = require('../src/models/Vehicle');
  const Schedule = require('../src/models/Schedule');
  const Booking = require('../src/models/Booking');
  const Notification = require('../src/models/Notification');

  // 1. Authenticate Review Driver
  console.log('\n--- 1. Authenticating Review Driver on Live Render ---');
  const driverLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: DRIVER_EMAIL,
    password: DRIVER_PASS,
    role: 'driver'
  });
  const driverToken = driverLoginRes.data.token;
  const driverProfile = driverLoginRes.data.driver;
  const driverId = String(driverProfile._id);
  console.log(`Driver Authenticated! ID: ${driverId} | Name: ${driverProfile.name}`);
  console.log(`Driver Push Token: ${driverProfile.pushToken ? driverProfile.pushToken.slice(0, 20) + '...' : 'none'}`);

  // 2. Authenticate Customer
  console.log('\n--- 2. Authenticating Customer on Live Render ---');
  const customerUser = await User.findOne({ role: 'customer' });
  const customerToken = jwt.sign(
    { id: customerUser._id, role: 'customer' },
    process.env.JWT_SECRET || 'transport_platform_jwt_secret_key_2026_super_secure',
    { expiresIn: '1d' }
  );
  console.log(`Customer: ${customerUser.name} (${customerUser.phone})`);

  // 3. Prepare Unauthorized Driver for 403 test
  const unauthDriverUser = await User.findOne({ email: 'unauth_driver_test@example.com' });
  const unauthDriver = await Driver.findOne({ user: unauthDriverUser._id });
  const unauthDriverToken = jwt.sign(
    { id: unauthDriverUser._id, role: 'driver', driverId: unauthDriver._id },
    process.env.JWT_SECRET || 'transport_platform_jwt_secret_key_2026_super_secure',
    { expiresIn: '1d' }
  );

  const results = {};

  // ===========================================================================
  // TEST A: SCHEDULED BUS BOOKING
  // ===========================================================================
  console.log('\n===============================================================');
  console.log('🚌 TEST A: FRESH SCHEDULED BUS BOOKING');
  console.log('===============================================================');
  const busVehicle = await Vehicle.findOne({ vehicleNumber: 'BA 2 KHA 7788' });
  const busSchedule = await Schedule.findOne({ vehicle: busVehicle._id, status: 'Active' });
  const busSeat = `B${Math.floor(10 + Math.random() * 89)}`;

  console.log(`Using Bus: ${busVehicle.vehicleNumber} (ID: ${busVehicle._id})`);
  console.log(`Using Bus Schedule: ${busSchedule?._id || 'null'}`);

  const busBookingPayload = {
    vehicleId: String(busVehicle._id),
    serviceType: 'Bus',
    pickupLocation: busSchedule.origin,
    dropLocation: busSchedule.destination,
    passengerDetails: [{ name: customerUser.name, age: 30, gender: 'Male' }],
    selectedSeats: [busSeat],
    bookingMode: 'SCHEDULE',
    fare: 750,
    paymentMethod: 'Offline Cash',
    travelDate: busSchedule.travelDate.toISOString(),
    scheduleId: String(busSchedule._id)
  };

  const busCreateRes = await axios.post(`${BASE_URL}/bookings/schedule`, busBookingPayload, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  console.log('Bus Booking API HTTP Status:', busCreateRes.status);
  const busBookingData = busCreateRes.data.data;
  const busBookingId = busBookingData.bookingId;
  const busCustomerOtp = busBookingData.confirmationOtp;
  console.log(`✅ Created Scheduled Bus Booking ID: ${busBookingId}`);
  console.log(`   bookingMode: ${busBookingData.bookingMode}`);
  console.log(`   scheduleId: ${busBookingData.scheduleId}`);
  console.log(`   Customer OTP: ${busCustomerOtp}`);

  // Wait 3 seconds for async notification and push dispatch
  await new Promise(r => setTimeout(r, 3000));

  // Inspect DB
  const busDb = await Booking.findOne({ bookingId: busBookingId }).lean();
  console.log(`DB Record bookingMode: ${busDb.bookingMode} | Status: ${busDb.bookingStatus} | Driver: ${busDb.driver}`);
  console.log(`Matches Review Driver: ${String(busDb.driver) === driverId}`);

  // Notification DB check
  const busNotif = await Notification.findOne({ bookingId: busBookingId, driverId: driverId }).lean();
  console.log(`Bus Driver Notification in DB: ${busNotif ? 'FOUND (' + busNotif._id + ')' : 'NOT FOUND'}`);

  // Live Driver Notifications API
  const busNotifsRes = await axios.get(`${BASE_URL}/driver/notifications`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const busHasLiveNotif = (busNotifsRes.data.data || []).some(n => n.bookingId === busBookingId || String(n.entityId) === String(busDb._id));
  console.log(`Visible in Live Driver Notifications API: ${busHasLiveNotif}`);

  // Live Driver Requests API (GET /driver/booking-requests)
  const busReqRes = await axios.get(`${BASE_URL}/driver/booking-requests`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const busInRequests = (busReqRes.data.data || []).find(b => b.bookingId === busBookingId);
  console.log(`Visible in Live Driver Requests API: ${Boolean(busInRequests)}`);
  if (busInRequests) {
    console.log(`   Remaining Seconds: ${busInRequests.remainingSeconds}`);
    console.log(`   customerViewOtp leaked? ${busInRequests.customerViewOtp !== undefined} (Value: ${busInRequests.customerViewOtp})`);
  }

  // Live Driver Active Bookings API (GET /driver/active-bookings)
  const busActiveRes = await axios.get(`${BASE_URL}/driver/active-bookings`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const busInActive = (busActiveRes.data.data || []).find(b => b.bookingId === busBookingId);
  console.log(`Visible in Live Driver Active Bookings API: ${Boolean(busInActive)}`);
  if (busInActive) {
    console.log(`   customerViewOtp leaked? ${busInActive.customerViewOtp !== undefined}`);
  }

  // Unauthorized Driver 403 test
  let busUnauthBlocked = false;
  try {
    await axios.post(`${BASE_URL}/driver/bookings/${busBookingId}/verify-otp`, { otp: busCustomerOtp }, {
      headers: { Authorization: `Bearer ${unauthDriverToken}` }
    });
  } catch (err) {
    busUnauthBlocked = err.response?.status === 403;
  }
  console.log(`Unauthorized Driver Blocked with 403: ${busUnauthBlocked}`);

  // Driver Confirms Booking via OTP (POST /driver/bookings/:id/verify-otp)
  const busConfirmRes = await axios.post(`${BASE_URL}/driver/bookings/${busBookingId}/verify-otp`, {
    otp: busCustomerOtp
  }, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log(`Review Driver OTP Confirmation HTTP Status: ${busConfirmRes.status}`);
  const busPostConfirmDb = await Booking.findOne({ bookingId: busBookingId }).lean();
  console.log(`Post-Confirm Status: ${busPostConfirmDb.bookingStatus} | Driver Confirmed: ${busPostConfirmDb.driverConfirmed}`);

  results.bus = {
    bookingId: busBookingId,
    bookingMode: busDb.bookingMode,
    scheduleId: String(busDb.scheduleId),
    driverId: String(busDb.driver),
    vehicle: busVehicle.vehicleNumber,
    apiStatus: busCreateRes.status,
    notifFound: !!busNotif,
    visibleInRequests: !!busInRequests,
    visibleInActive: !!busInActive,
    unauthBlocked: busUnauthBlocked,
    confirmed: busPostConfirmDb.driverConfirmed,
    otpLeaked: busInRequests?.customerViewOtp !== undefined || busInActive?.customerViewOtp !== undefined
  };

  // ===========================================================================
  // TEST B: SCHEDULED EV-SEWA BOOKING
  // ===========================================================================
  console.log('\n===============================================================');
  console.log('⚡ TEST B: FRESH SCHEDULED EV-SEWA BOOKING');
  console.log('===============================================================');
  const evVehicle = await Vehicle.findOne({ vehicleNumber: 'BA 3 CHA 5566' });
  const evSchedule = await Schedule.findOne({ vehicle: evVehicle._id, status: 'Active' });

  console.log(`Using EV: ${evVehicle.vehicleNumber} (ID: ${evVehicle._id})`);
  console.log(`Using EV Schedule: ${evSchedule?._id || 'null'}`);

  const evBookingPayload = {
    vehicleId: String(evVehicle._id),
    serviceType: 'EV-Sewa',
    pickupLocation: evSchedule.origin,
    dropLocation: evSchedule.destination,
    passengerDetails: [{ name: customerUser.name, age: 30, gender: 'Male' }],
    passengerCount: 1,
    bookingMode: 'SCHEDULE',
    fare: 650,
    paymentMethod: 'Offline Cash',
    travelDate: evSchedule.travelDate.toISOString(),
    scheduleId: String(evSchedule._id)
  };

  const evCreateRes = await axios.post(`${BASE_URL}/bookings/schedule`, evBookingPayload, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  console.log('EV-Sewa Booking API HTTP Status:', evCreateRes.status);
  const evBookingData = evCreateRes.data.data;
  const evBookingId = evBookingData.bookingId;
  const evCustomerOtp = evBookingData.confirmationOtp;
  console.log(`✅ Created Scheduled EV-Sewa Booking ID: ${evBookingId}`);
  console.log(`   bookingMode: ${evBookingData.bookingMode}`);
  console.log(`   scheduleId: ${evBookingData.scheduleId}`);

  await new Promise(r => setTimeout(r, 3000));

  const evDb = await Booking.findOne({ bookingId: evBookingId }).lean();
  console.log(`DB Record bookingMode: ${evDb.bookingMode} | Status: ${evDb.bookingStatus} | Driver: ${evDb.driver}`);

  const evNotif = await Notification.findOne({ bookingId: evBookingId, driverId: driverId }).lean();
  console.log(`EV Driver Notification in DB: ${evNotif ? 'FOUND (' + evNotif._id + ')' : 'NOT FOUND'}`);

  const evReqRes = await axios.get(`${BASE_URL}/driver/booking-requests`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const evInRequests = (evReqRes.data.data || []).find(b => b.bookingId === evBookingId);
  console.log(`Visible in Live Driver Requests API: ${Boolean(evInRequests)}`);

  const evActiveRes = await axios.get(`${BASE_URL}/driver/active-bookings`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const evInActive = (evActiveRes.data.data || []).find(b => b.bookingId === evBookingId);
  console.log(`Visible in Live Driver Active Bookings API: ${Boolean(evInActive)}`);

  let evUnauthBlocked = false;
  try {
    await axios.post(`${BASE_URL}/driver/bookings/${evBookingId}/verify-otp`, { otp: evCustomerOtp }, {
      headers: { Authorization: `Bearer ${unauthDriverToken}` }
    });
  } catch (err) {
    evUnauthBlocked = err.response?.status === 403;
  }
  console.log(`Unauthorized Driver Blocked with 403: ${evUnauthBlocked}`);

  const evConfirmRes = await axios.post(`${BASE_URL}/driver/bookings/${evBookingId}/verify-otp`, {
    otp: evCustomerOtp
  }, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log(`Review Driver OTP Confirmation HTTP Status: ${evConfirmRes.status}`);
  const evPostConfirmDb = await Booking.findOne({ bookingId: evBookingId }).lean();
  console.log(`Post-Confirm Status: ${evPostConfirmDb.bookingStatus} | Driver Confirmed: ${evPostConfirmDb.driverConfirmed}`);

  results.ev = {
    bookingId: evBookingId,
    bookingMode: evDb.bookingMode,
    scheduleId: String(evDb.scheduleId),
    driverId: String(evDb.driver),
    vehicle: evVehicle.vehicleNumber,
    apiStatus: evCreateRes.status,
    notifFound: !!evNotif,
    visibleInRequests: !!evInRequests,
    visibleInActive: !!evInActive,
    unauthBlocked: evUnauthBlocked,
    confirmed: evPostConfirmDb.driverConfirmed,
    otpLeaked: evInRequests?.customerViewOtp !== undefined || evInActive?.customerViewOtp !== undefined
  };

  // ===========================================================================
  // TEST C: SCHEDULED CAR BOOKING
  // ===========================================================================
  console.log('\n===============================================================');
  console.log('🚗 TEST C: FRESH SCHEDULED CAR BOOKING');
  console.log('===============================================================');
  const carVehicle = await Vehicle.findOne({ vehicleNumber: 'UP70TR1234' });
  const carSchedule = await Schedule.findOne({ vehicle: carVehicle._id, status: 'Active' });

  console.log(`Using Car: ${carVehicle.vehicleNumber} (ID: ${carVehicle._id})`);
  console.log(`Using Car Schedule: ${carSchedule?._id || 'null'}`);

  const carBookingPayload = {
    vehicleId: String(carVehicle._id),
    serviceType: 'Car',
    pickupLocation: carSchedule.origin,
    dropLocation: carSchedule.destination,
    passengerDetails: [{ name: customerUser.name, age: 30, gender: 'Male' }],
    bookingMode: 'SCHEDULE',
    fare: 500,
    paymentMethod: 'Offline Cash',
    travelDate: carSchedule.travelDate.toISOString(),
    scheduleId: String(carSchedule._id)
  };

  const carCreateRes = await axios.post(`${BASE_URL}/bookings/schedule`, carBookingPayload, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  console.log('Car Booking API HTTP Status:', carCreateRes.status);
  const carBookingData = carCreateRes.data.data;
  const carBookingId = carBookingData.bookingId;
  const carCustomerOtp = carBookingData.confirmationOtp;
  console.log(`✅ Created Scheduled Car Booking ID: ${carBookingId}`);
  console.log(`   bookingMode: ${carBookingData.bookingMode}`);
  console.log(`   scheduleId: ${carBookingData.scheduleId}`);

  await new Promise(r => setTimeout(r, 3000));

  const carDb = await Booking.findOne({ bookingId: carBookingId }).lean();
  console.log(`DB Record bookingMode: ${carDb.bookingMode} | Status: ${carDb.bookingStatus} | Driver: ${carDb.driver}`);

  const carNotif = await Notification.findOne({ bookingId: carBookingId, driverId: driverId }).lean();
  console.log(`Car Driver Notification in DB: ${carNotif ? 'FOUND (' + carNotif._id + ')' : 'NOT FOUND'}`);

  const carReqRes = await axios.get(`${BASE_URL}/driver/booking-requests`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const carInRequests = (carReqRes.data.data || []).find(b => b.bookingId === carBookingId);
  console.log(`Visible in Live Driver Requests API: ${Boolean(carInRequests)}`);

  const carActiveRes = await axios.get(`${BASE_URL}/driver/active-bookings`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const carInActive = (carActiveRes.data.data || []).find(b => b.bookingId === carBookingId);
  console.log(`Visible in Live Driver Active Bookings API: ${Boolean(carInActive)}`);

  let carUnauthBlocked = false;
  try {
    await axios.post(`${BASE_URL}/driver/bookings/${carBookingId}/verify-otp`, { otp: carCustomerOtp }, {
      headers: { Authorization: `Bearer ${unauthDriverToken}` }
    });
  } catch (err) {
    carUnauthBlocked = err.response?.status === 403;
  }
  console.log(`Unauthorized Driver Blocked with 403: ${carUnauthBlocked}`);

  const carConfirmRes = await axios.post(`${BASE_URL}/driver/bookings/${carBookingId}/verify-otp`, {
    otp: carCustomerOtp
  }, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log(`Review Driver OTP Confirmation HTTP Status: ${carConfirmRes.status}`);
  const carPostConfirmDb = await Booking.findOne({ bookingId: carBookingId }).lean();
  console.log(`Post-Confirm Status: ${carPostConfirmDb.bookingStatus} | Driver Confirmed: ${carPostConfirmDb.driverConfirmed}`);

  results.car = {
    bookingId: carBookingId,
    bookingMode: carDb.bookingMode,
    scheduleId: String(carDb.scheduleId),
    driverId: String(carDb.driver),
    vehicle: carVehicle.vehicleNumber,
    apiStatus: carCreateRes.status,
    notifFound: !!carNotif,
    visibleInRequests: !!carInRequests,
    visibleInActive: !!carInActive,
    unauthBlocked: carUnauthBlocked,
    confirmed: carPostConfirmDb.driverConfirmed,
    otpLeaked: carInRequests?.customerViewOtp !== undefined || carInActive?.customerViewOtp !== undefined
  };

  console.log('\n================================================================');
  console.log('SUMMARY OF ALL SCHEDULED SERVICES:');
  console.log(JSON.stringify(results, null, 2));
  console.log('================================================================');

  await mongoose.disconnect();
}

verifyAllScheduledServices().catch(err => {
  console.error('Scheduled verification failed:', err.response?.data || err.message);
  process.exit(1);
});
