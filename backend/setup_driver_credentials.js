const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./src/models/User');
const Driver = require('./src/models/Driver');
const Vehicle = require('./src/models/Vehicle');

async function setup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Amit Driver
    let amit = await User.findOne({ email: 'amit.driver@platform.com' });
    if (amit) {
      amit.status = 'Active';
      amit.password = 'driver123'; // pre-save hook will hash it
      await amit.save();
      console.log('Updated amit.driver@platform.com to Active with password driver123');
    } else {
      amit = await User.create({
        name: 'Amit Yadav',
        email: 'amit.driver@platform.com',
        phone: '+919833445566',
        password: 'driver123',
        role: 'driver',
        status: 'Active'
      });
      console.log('Created amit.driver@platform.com');
    }

    let amitDoc = await Driver.findOne({ user: amit._id });
    if (!amitDoc) {
      amitDoc = await Driver.create({
        user: amit._id,
        name: amit.name,
        mobileNumber: amit.phone,
        driverStatus: 'Active',
        drivingLicenceNumber: 'DL-04-AMIT-2026',
        drivingLicenceStatus: 'Approved',
        citizenshipStatus: 'Approved',
        rcStatus: 'Approved',
        insuranceStatus: 'Approved',
        fitnessStatus: 'Approved',
        requiredDocumentsStatus: 'Approved'
      });
    } else {
      amitDoc.driverStatus = 'Active';
      await amitDoc.save();
    }

    // 2. Vikram Driver
    let vikram = await User.findOne({ email: 'vikram.driver@platform.com' });
    if (vikram) {
      vikram.status = 'Active';
      vikram.password = 'driver123';
      await vikram.save();
      console.log('Updated vikram.driver@platform.com to Active with password driver123');
    } else {
      vikram = await User.create({
        name: 'Vikram Driver',
        email: 'vikram.driver@platform.com',
        phone: '+919866770001',
        password: 'driver123',
        role: 'driver',
        status: 'Active'
      });
      console.log('Created vikram.driver@platform.com');
    }

    let vikramDoc = await Driver.findOne({ user: vikram._id });
    if (!vikramDoc) {
      vikramDoc = await Driver.create({
        user: vikram._id,
        name: vikram.name,
        mobileNumber: vikram.phone,
        driverStatus: 'Active',
        drivingLicenceNumber: 'DL-05-VIKRAM-2026',
        drivingLicenceStatus: 'Approved',
        citizenshipStatus: 'Approved',
        rcStatus: 'Approved',
        insuranceStatus: 'Approved',
        fitnessStatus: 'Approved',
        requiredDocumentsStatus: 'Approved'
      });
    } else {
      vikramDoc.driverStatus = 'Active';
      await vikramDoc.save();
    }

    // Assign vehicles if available
    const vehicles = await Vehicle.find();
    if (vehicles.length > 0) {
      if (!amitDoc.assignedVehicle && vehicles[0]) {
        amitDoc.assignedVehicle = vehicles[0]._id;
        await amitDoc.save();
      }
      if (!vikramDoc.assignedVehicle && vehicles[1]) {
        vikramDoc.assignedVehicle = vehicles[1]._id;
        await vikramDoc.save();
      }
    }

    console.log('=== ACCOUNTS READY ===');
    console.log({
      amit: { email: amit.email, pass: 'driver123', status: amit.status },
      vikram: { email: vikram.email, pass: 'driver123', status: vikram.status }
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Setup error:', err);
  }
}

setup();
