require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');

async function createReviewDriver() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in backend/.env');
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('Connected to DB:', mongoose.connection.name);

  const reviewEmail = 'krpintukr083+driverreview@gmail.com'.toLowerCase();
  const reviewPassword = 'YatraDriver@Review26!';
  const reviewPhone = '+9779800000099';

  // 1. Check or Create User
  let user = await User.findOne({ email: reviewEmail });
  if (user) {
    console.log('Existing review user found. Updating password and status...');
    user.name = 'Google Play Review Driver';
    user.password = reviewPassword; // pre-save hook will bcrypt hash it
    user.status = 'Active';
    user.role = 'driver';
    if (!user.phone) user.phone = reviewPhone;
    await user.save();
    console.log('Review user updated successfully:', user._id);
  } else {
    console.log('Creating new review user...');
    user = await User.create({
      name: 'Google Play Review Driver',
      email: reviewEmail,
      phone: reviewPhone,
      password: reviewPassword,
      role: 'driver',
      status: 'Active',
      profilePhoto: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
    });
    console.log('Review user created successfully:', user._id);
  }

  // Find a demo vehicle if available to assign to driver
  let vehicle = await Vehicle.findOne({ status: 'Active' });
  console.log('Assigned Demo Vehicle:', vehicle ? `${vehicle.vehicleName} (${vehicle.vehicleNumber})` : 'None');

  // 2. Check or Create Driver Profile
  let driver = await Driver.findOne({ user: user._id });
  if (driver) {
    console.log('Existing driver profile found. Updating documents and status to Active...');
    driver.name = user.name;
    driver.mobileNumber = user.phone;
    driver.driverStatus = 'Active';
    driver.isOnline = true;
    driver.canViewCustomerPhone = true;
    driver.drivingLicenceStatus = 'Approved';
    driver.citizenshipStatus = 'Approved';
    driver.rcStatus = 'Approved';
    driver.insuranceStatus = 'Approved';
    driver.fitnessStatus = 'Approved';
    driver.requiredDocumentsStatus = 'Approved';
    if (vehicle && !driver.assignedVehicle) {
      driver.assignedVehicle = vehicle._id;
    }
    await driver.save();
    console.log('Driver profile updated successfully:', driver._id);
  } else {
    console.log('Creating new Driver profile...');
    driver = await Driver.create({
      user: user._id,
      name: user.name,
      mobileNumber: user.phone,
      driverStatus: 'Active',
      isOnline: true,
      canViewCustomerPhone: true,
      drivingLicenceNumber: 'DL-REVIEW-2026',
      drivingLicenceDoc: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      drivingLicenceStatus: 'Approved',
      citizenshipNumber: 'CIT-REVIEW-2026',
      citizenshipStatus: 'Approved',
      rcNumber: vehicle ? vehicle.vehicleNumber : 'BA 2 KHA 2026',
      rcDetails: 'Commercial Passenger Stage Carriage',
      rcStatus: 'Approved',
      insurancePolicyNumber: 'INS-REVIEW-2026',
      vehicleInsurance: 'Comprehensive Commercial Passenger Insurance',
      insuranceStatus: 'Approved',
      fitnessDetails: 'Fitness Inspection Certified',
      fitnessStatus: 'Approved',
      requiredDocumentsStatus: 'Approved',
      assignedVehicle: vehicle ? vehicle._id : null
    });
    console.log('Driver profile created successfully:', driver._id);
  }

  console.log('\n--- VERIFYING PASSWORD HASH ---');
  const userWithPassword = await User.findOne({ email: reviewEmail }).select('+password');
  const isMatch = await userWithPassword.matchPassword(reviewPassword);
  console.log('Bcrypt Password Match verification:', isMatch ? 'PASSED ✅' : 'FAILED ❌');
  console.log('Password stored as bcrypt hash starting with:', userWithPassword.password.substring(0, 7));

  await mongoose.disconnect();
  console.log('Database disconnected.');
}

createReviewDriver().catch(err => {
  console.error('Error creating review driver:', err);
  process.exit(1);
});
