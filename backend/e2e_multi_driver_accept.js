const mongoose = require('mongoose');
require('dotenv').config();
const Driver = require('./src/models/Driver');
const Booking = require('./src/models/Booking');
const User = require('./src/models/User');
const Vehicle = require('./src/models/Vehicle');
const driverController = require('./src/controllers/driverController');
const bookingController = require('./src/controllers/bookingController');

// Mock request and response objects
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    res.set = () => res;
    return res;
};

async function createMockUserAndBooking() {
    // We create a booking
    let user = await User.findOne({ phone: '9999999999' });
    if (!user) {
        user = await User.create({ name: 'Test User', phone: '9999999999', email: 'test@example.com', password: 'password123', role: 'customer' });
    }
    
    // Create a new Car Instant booking Jaipur to Delhi
    const req = {
        user,
        body: {
            serviceType: 'Car',
            bookingMode: 'INSTANT',
            pickupLocation: 'Jaipur',
            dropLocation: 'Delhi',
            travelDate: new Date().toISOString(),
            passengerDetails: [{ name: 'Test Pass', age: 25, gender: 'M' }]
        }
    };
    const booking = await Booking.create({
        user: user._id,
        customer: user._id,
        serviceType: 'Car',
        bookingMode: 'INSTANT',
        pickupLocation: 'Jaipur',
        dropLocation: 'Delhi',
        travelDate: new Date(),
        passengerDetails: [{ name: 'Test Pass', age: 25, gender: 'M' }],
        paymentMethod: 'Offline Cash',
        fare: 100,
        bookingStatus: 'Pending',
        rideStatus: 'Pending'
    });
    return booking._id;
}

async function runTests() {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    
    // Find multiple drivers with route Jaipur -> Delhi
    const drivers = await Driver.find({ 'route.origin': 'Jaipur', 'route.destination': 'Delhi', driverStatus: 'Approved' }).limit(3);
    console.log(`Found ${drivers.length} drivers for Jaipur to Delhi`);
    if (drivers.length < 2) {
        console.log('Need at least 2 drivers to test concurrent accept.');
        process.exit(1);
    }
    
    // Driver D wrong route
    const wrongDriver = await Driver.findOne({ 'route.origin': 'Jaipur', 'route.destination': 'Agra', driverStatus: 'Approved' });
    
    // 1. Create a Booking
    const bookingId = await createMockUserAndBooking();
    console.log('Created booking:', bookingId);
    
    // 2. Check if drivers receive it
    const checkRequests = async (driver) => {
        const req = { driver };
        const res = mockRes();
        await driverController.getBookingRequests(req, res, (err) => {});
        return res.data;
    };
    
    console.log('\n--- NOTIFICATION BROADCAST ---');
    for (const driver of drivers) {
        const reqs = await checkRequests(driver);
        const hasBooking = reqs.data && reqs.data.find(b => b.id.toString() === bookingId.toString());
        console.log(`Driver ${driver.name} (Same-route): ${hasBooking ? 'PASS' : 'FAIL'} (Found ${reqs.data ? reqs.data.length : 0} requests)`);
    }
    
    if (wrongDriver) {
        const reqsWrong = await checkRequests(wrongDriver);
        const hasBookingWrong = reqsWrong.data && reqsWrong.data.find(b => b.id.toString() === bookingId.toString());
        console.log(`Driver ${wrongDriver.name} (Wrong-route): ${hasBookingWrong ? 'FAIL' : 'PASS'} (Found ${reqsWrong.data ? reqsWrong.data.length : 0} requests)`);
    } else {
        console.log(`Wrong-route driver: SKIPPED (not found)`);
    }
    
    console.log('\n--- FIRST ACCEPT WINS ---');
    // Driver A accepts
    const driverA = drivers[0];
    const driverB = drivers[1];
    
    const acceptReqA = {
        driver: driverA,
        params: { id: bookingId },
        bookingObj: await Booking.findById(bookingId)
    };
    const acceptResA = mockRes();
    await driverController.acceptInstantBookingRequest(acceptReqA, acceptResA, (err) => {});
    console.log(`Driver A accept: ${acceptResA.data && acceptResA.data.success ? 'PASS' : 'FAIL'} - ${acceptResA.data ? acceptResA.data.message : ''}`);
    
    // Driver B accepts
    const acceptReqB = {
        driver: driverB,
        params: { id: bookingId },
        bookingObj: await Booking.findById(bookingId)
    };
    const acceptResB = mockRes();
    await driverController.acceptInstantBookingRequest(acceptReqB, acceptResB, (err) => {});
    console.log(`Driver B accept: ${acceptResB.statusCode === 409 ? 'PASS' : 'FAIL'} (Expected 409 Booking unavailable, got ${acceptResB.statusCode}) - ${acceptResB.data ? acceptResB.data.message : ''}`);
    
    // Check if OTP was generated
    const updatedBooking = await Booking.findById(bookingId);
    console.log('\n--- OTP ---');
    console.log(`First accepted driver OTP generated: ${updatedBooking.confirmationOtp ? 'PASS' : 'FAIL'} (${updatedBooking.confirmationOtp})`);
    
    console.log('\nTests completed.');
    process.exit(0);
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
