const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Cancellation = require('../src/models/Cancellation');
const Compensation = require('../src/models/Compensation');
const Withdrawal = require('../src/models/Withdrawal');
const Expense = require('../src/models/Expense');
const Incentive = require('../src/models/Incentive');
const Notification = require('../src/models/Notification');
const Support = require('../src/models/Support');

async function resetDatabase() {
  console.log('===========================================================');
  console.log('RESETTING DATABASE TO CLEAN DEMO STATE');
  console.log('===========================================================');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment!');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Delete all transactional history / bookings
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Cancellation.deleteMany({});
    await Compensation.deleteMany({});
    await Withdrawal.deleteMany({});
    await Expense.deleteMany({});
    await Incentive.deleteMany({});
    await Notification.deleteMany({});
    await Support.deleteMany({});
    console.log('✅ 1. All bookings, payments, cancellations, compensations, withdrawals, expenses, incentives, notifications & support tickets WIPED (0 remaining)');

    // 2. Preserve Super Admin and Priya Customer
    const adminUser = await User.findOne({ role: 'admin' });
    console.log('Admin user preserved:', adminUser ? adminUser.email : 'None found');

    let priyaUser = await User.findOne({
      $or: [{ email: 'priya.nair@example.com' }, { phone: '+919844556677' }, { name: /Priya/i }]
    });

    if (!priyaUser) {
      priyaUser = await User.create({
        name: 'Priya Nair',
        email: 'priya.nair@example.com',
        phone: '+919844556677',
        password: 'user123',
        role: 'customer',
        status: 'Active'
      });
      console.log('Created default customer Priya Nair (password: user123)');
    } else {
      priyaUser.name = 'Priya Nair';
      priyaUser.email = 'priya.nair@example.com';
      priyaUser.phone = '+919844556677';
      priyaUser.password = 'user123'; // Triggers pre-save hash hook
      priyaUser.role = 'customer';
      priyaUser.status = 'Active';
      await priyaUser.save();
      console.log('Preserved & updated default customer Priya Nair (password: user123)');
    }

    // Delete all other users and drivers
    const preserveUserIds = [priyaUser._id];
    if (adminUser) preserveUserIds.push(adminUser._id);

    await Driver.deleteMany({});
    await User.deleteMany({ _id: { $nin: preserveUserIds } });
    await Vehicle.deleteMany({});
    console.log('✅ 2. Cleaned all obsolete users, drivers, and vehicles');

    // 3. Create the 3 Demo Drivers (Harsh, Ayush, Pintu)
    const driverConfigs = [
      {
        name: 'Harsh',
        email: 'harsh.driver@platform.com',
        phone: '+919876500001',
        password: 'driver123',
        licence: 'DL-01-HARSH-2026',
        busName: 'Royal Intercity Deluxe Express',
        busNumber: 'DL 01 AB 4321'
      },
      {
        name: 'Ayush',
        email: 'ayush.driver@platform.com',
        phone: '+919876500002',
        password: 'driver123',
        licence: 'DL-02-AYUSH-2026',
        busName: 'Shivam Travels Premium',
        busNumber: 'DL 02 CD 5678'
      },
      {
        name: 'Pintu',
        email: 'pintu.driver@platform.com',
        phone: '+919876500003',
        password: 'driver123',
        licence: 'DL-03-PINTU-2026',
        busName: 'Rajputana Express',
        busNumber: 'DL 03 EF 9012'
      }
    ];

    const createdDrivers = [];
    const createdBuses = [];

    for (const d of driverConfigs) {
      // Create User doc
      const userDoc = await User.create({
        name: d.name,
        email: d.email,
        phone: d.phone,
        password: d.password, // Pre-save hook hashes password
        role: 'driver',
        status: 'Active'
      });

      // Create Driver doc
      const driverDoc = await Driver.create({
        user: userDoc._id,
        name: d.name,
        mobileNumber: d.phone,
        driverStatus: 'Active',
        isOnline: true,
        drivingLicenceNumber: d.licence,
        drivingLicenceStatus: 'Approved',
        citizenshipStatus: 'Approved',
        rcStatus: 'Approved',
        insuranceStatus: 'Approved',
        fitnessStatus: 'Approved',
        requiredDocumentsStatus: 'Approved',
        walletBalance: 0,
        totalEarnings: 0,
        totalBonus: 0,
        totalCommission: 0,
        totalWithdrawn: 0,
        rating: 4.9,
        totalRatingsCount: 15
      });

      // Create Bus doc
      const busDoc = await Vehicle.create({
        vehicleSource: 'OWN',
        vehicleNumber: d.busNumber,
        vehicleType: 'Bus',
        vehicleCategory: 'AC Sleeper 2+1',
        vehicleModel: 'Volvo 9600 Multi-Axle',
        vehicleName: d.busName,
        seatingCapacity: 36,
        ownerName: `${d.name} Transport`,
        ownerMobileNumber: d.phone,
        assignedDriver: driverDoc._id,
        vehicleStatus: 'Active',
        fareRate: 500,
        route: {
          origin: 'Delhi',
          destination: 'Jaipur',
          departureTime: '06:00 AM',
          arrivalTime: '11:30 AM',
          duration: '5h 30m',
          boardingPoints: ['ISBT Kashmiri Gate', 'Dhaula Kuan', 'Iffco Chowk Gurgaon'],
          droppingPoints: ['Kotputli', 'Amer Fort Cut', 'Sindhi Camp Jaipur']
        },
        busDetails: {
          busType: 'AC Sleeper',
          seatLayout: '2+1 Luxury Sleeper',
          availableSeats: 36
        },
        vehicleImages: [
          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
        ]
      });

      // Link driver -> assignedVehicle
      driverDoc.assignedVehicle = busDoc._id;
      await driverDoc.save();

      createdDrivers.push(driverDoc);
      createdBuses.push(busDoc);
      console.log(`✅ Driver & Bus Created & Assigned: ${d.name} -> ${d.busName} (${d.busNumber})`);
    }

    console.log('\n===========================================================');
    console.log('FINAL DATABASE VERIFICATION');
    console.log('===========================================================');

    const customerCount = await User.countDocuments({ role: 'customer' });
    const driverCount = await Driver.countDocuments();
    const vehicleCount = await Vehicle.countDocuments();
    const bookingCount = await Booking.countDocuments();

    console.log(`- Customers: ${customerCount} (Priya Nair)`);
    console.log(`- Drivers: ${driverCount} (Harsh, Ayush, Pintu)`);
    console.log(`- Buses: ${vehicleCount} (Delhi -> Jaipur)`);
    console.log(`- Bookings: ${bookingCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Reset Database Error:', err);
    process.exit(1);
  }
}

resetDatabase();
