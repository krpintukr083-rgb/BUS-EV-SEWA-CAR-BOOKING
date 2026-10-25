const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const ServiceControl = require('../src/models/ServiceControl');

const KNOWN_PASSWORD = 'Password123';

async function setupMultiDriverTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  // Ensure ServiceControl has oppositeRouteNotifications = false
  let sc = await ServiceControl.findOne();
  if (!sc) {
    sc = await ServiceControl.create({ oppositeRouteNotifications: false });
  } else {
    sc.oppositeRouteNotifications = false;
    await sc.save();
  }
  console.log('ServiceControl oppositeRouteNotifications:', sc.oppositeRouteNotifications);

  // Helper to configure vehicle
  async function ensureVehicle({ plateNumber, vehicleType, origin, destination, driverId }) {
    let veh = await Vehicle.findOne({ vehicleNumber: plateNumber });
    if (!veh) {
      veh = new Vehicle({
        vehicleNumber: plateNumber,
        plateNumber,
        vehicleName: `Test ${vehicleType} ${plateNumber}`,
        vehicleType,
        vehicleCategory: vehicleType === 'Bus' ? 'AC Deluxe' : 'Sedan',
        vehicleModel: vehicleType === 'Bus' ? 'Tata Starbus' : 'Suzuki Dzire',
        ownerName: 'Yatra Test Owner',
        ownerMobileNumber: '9800000000',
        vehicleStatus: 'Active',
        assignedDriver: driverId,
        route: { origin, destination },
        seatingCapacity: vehicleType === 'Bus' ? 30 : 4,
        amenities: ['AC', 'WiFi']
      });
      await veh.save();
    } else {
      veh.vehicleType = vehicleType;
      veh.vehicleStatus = 'Active';
      veh.assignedDriver = driverId;
      veh.route = { origin, destination };
      await veh.save();
    }
    return veh;
  }

  // 1. Driver 1 - Kathmandu -> Birgunj, Car (Review Driver: 6acc574da487392ee5d5ac42)
  const d1 = await Driver.findById('6acc574da487392ee5d5ac42').populate('user');
  const u1 = await User.findById(d1.user._id || d1.user);
  u1.password = KNOWN_PASSWORD;
  u1.status = 'Active';
  await u1.save();
  const v1 = await ensureVehicle({
    plateNumber: 'CAR-D1-KTM-BRG',
    vehicleType: 'Car',
    origin: 'Kathmandu',
    destination: 'Birgunj',
    driverId: d1._id
  });
  d1.assignedVehicle = v1._id;
  d1.route = { origin: 'Kathmandu', destination: 'Birgunj' };
  d1.isOnline = true;
  d1.driverStatus = 'Active';
  await d1.save();
  console.log('Driver 1 Ready:', { id: d1._id, name: d1.name, phone: u1.phone, vehicle: v1.vehicleType, route: `${d1.route.origin} -> ${d1.route.destination}` });

  // 2. Driver 2 - Kathmandu -> Birgunj, Car (Ganesh Yadav: 6acf7c8be5f627958261d463)
  const d2 = await Driver.findById('6acf7c8be5f627958261d463').populate('user');
  const u2 = await User.findById(d2.user._id || d2.user);
  u2.password = KNOWN_PASSWORD;
  u2.status = 'Active';
  await u2.save();
  const v2 = await ensureVehicle({
    plateNumber: 'CAR-D2-KTM-BRG',
    vehicleType: 'Car',
    origin: 'Kathmandu',
    destination: 'Birgunj',
    driverId: d2._id
  });
  d2.assignedVehicle = v2._id;
  d2.route = { origin: 'Kathmandu', destination: 'Birgunj' };
  d2.isOnline = true;
  d2.driverStatus = 'Active';
  await d2.save();
  console.log('Driver 2 Ready:', { id: d2._id, name: d2.name, phone: u2.phone, vehicle: v2.vehicleType, route: `${d2.route.origin} -> ${d2.route.destination}` });

  // 3. Driver 3 - Kathmandu -> Birgunj, Car (Rambabu Kumar sah: 6ad5b890729fb3cb431cf402)
  const d3 = await Driver.findById('6ad5b890729fb3cb431cf402').populate('user');
  const u3 = await User.findById(d3.user._id || d3.user);
  u3.password = KNOWN_PASSWORD;
  u3.status = 'Active';
  await u3.save();
  const v3 = await ensureVehicle({
    plateNumber: 'CAR-D3-KTM-BRG',
    vehicleType: 'Car',
    origin: 'Kathmandu',
    destination: 'Birgunj',
    driverId: d3._id
  });
  d3.assignedVehicle = v3._id;
  d3.route = { origin: 'Kathmandu', destination: 'Birgunj' };
  d3.isOnline = true;
  d3.driverStatus = 'Active';
  await d3.save();
  console.log('Driver 3 Ready:', { id: d3._id, name: d3.name, phone: u3.phone, vehicle: v3.vehicleType, route: `${d3.route.origin} -> ${d3.route.destination}` });

  // 4. Opposite Driver - Birgunj -> Kathmandu, Car (Om prakash sah: 6ad77ba241c7345919e94c1e)
  const dOpp = await Driver.findById('6ad77ba241c7345919e94c1e').populate('user');
  const uOpp = await User.findById(dOpp.user._id || dOpp.user);
  uOpp.password = KNOWN_PASSWORD;
  uOpp.status = 'Active';
  await uOpp.save();
  const vOpp = await ensureVehicle({
    plateNumber: 'CAR-OPP-BRG-KTM',
    vehicleType: 'Car',
    origin: 'Birgunj',
    destination: 'Kathmandu',
    driverId: dOpp._id
  });
  dOpp.assignedVehicle = vOpp._id;
  dOpp.route = { origin: 'Birgunj', destination: 'Kathmandu' };
  dOpp.isOnline = true;
  dOpp.driverStatus = 'Active';
  await dOpp.save();
  console.log('Opposite Driver Ready:', { id: dOpp._id, name: dOpp.name, phone: uOpp.phone, vehicle: vOpp.vehicleType, route: `${dOpp.route.origin} -> ${dOpp.route.destination}` });

  // 5. Incompatible Driver - Kathmandu -> Birgunj, Bus (Rahul Kumar mahato: 6ad7770c41c7345919e94a6f)
  const dIncomp = await Driver.findById('6ad7770c41c7345919e94a6f').populate('user');
  const uIncomp = await User.findById(dIncomp.user._id || dIncomp.user);
  uIncomp.password = KNOWN_PASSWORD;
  uIncomp.status = 'Active';
  await uIncomp.save();
  const vIncomp = await ensureVehicle({
    plateNumber: 'BUS-INCOMP-KTM-BRG',
    vehicleType: 'Bus',
    origin: 'Kathmandu',
    destination: 'Birgunj',
    driverId: dIncomp._id
  });
  dIncomp.assignedVehicle = vIncomp._id;
  dIncomp.route = { origin: 'Kathmandu', destination: 'Birgunj' };
  dIncomp.isOnline = true;
  dIncomp.driverStatus = 'Active';
  await dIncomp.save();
  console.log('Incompatible Driver Ready:', { id: dIncomp._id, name: dIncomp.name, phone: uIncomp.phone, vehicle: vIncomp.vehicleType, route: `${dIncomp.route.origin} -> ${dIncomp.route.destination}` });

  console.log('\n--- SETUP SUMMARY ---');
  console.log('Eligible Drivers (Kathmandu -> Birgunj, Car):');
  console.log('  1. Driver 1:', d1.name, `(${u1.phone})`);
  console.log('  2. Driver 2:', d2.name, `(${u2.phone})`);
  console.log('  3. Driver 3:', d3.name, `(${u3.phone})`);
  console.log('Control Drivers:');
  console.log('  Opposite Route (Birgunj -> Kathmandu, Car):', dOpp.name, `(${uOpp.phone})`);
  console.log('  Incompatible Service (Kathmandu -> Birgunj, Bus):', dIncomp.name, `(${uIncomp.phone})`);

  process.exit(0);
}

setupMultiDriverTest().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
