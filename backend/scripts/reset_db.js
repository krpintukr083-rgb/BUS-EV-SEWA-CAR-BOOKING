require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Banner = require('../src/models/Banner');
const Vehicle = require('../src/models/Vehicle');
const Schedule = require('../src/models/Schedule');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('THIS WILL DELETE ALL APPLICATION DATA EXCEPT USERS, DRIVERS AND BANNERS.');
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');
  console.log('Database Name:', mongoose.connection.db.databaseName);

  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);

  const preserve = ['users', 'drivers', 'banners'];
  const toClear = collectionNames.filter((name) => !preserve.includes(name) && !name.startsWith('system.'));

  console.log('Collections to preserve:', preserve);
  console.log('Collections to clear:', toClear);

  // Get before counts
  const beforeCounts = {};
  for (const name of collectionNames) {
    if (!name.startsWith('system.')) {
      beforeCounts[name] = await mongoose.connection.db.collection(name).countDocuments();
    }
  }

  console.log('\n--- COLLECTION COUNTS BEFORE ---');
  for (const [name, count] of Object.entries(beforeCounts)) {
    console.log(`${name}: ${count}`);
  }

  console.log('\nClearing collections...');
  for (const name of toClear) {
    await mongoose.connection.db.collection(name).deleteMany({});
  }
  console.log('Cleared successfully.');

  console.log('\nSeeding Vehicles & Schedules...');
  // Find existing drivers
  const harsh = await Driver.findOne({ name: /Harsh/i }) || await Driver.findOne({ mobileNumber: '+919876500001' }) || await Driver.findOne();
  const ayush = await Driver.findOne({ name: /Ayush/i }) || await Driver.findOne({ mobileNumber: '+919876500002' }) || await Driver.findOne();
  const pintu = await Driver.findOne({ name: /Pintu/i }) || await Driver.findOne({ mobileNumber: '+919876500003' }) || await Driver.findOne();

  const driverRefs = [harsh, ayush, pintu].filter(Boolean);

  if (driverRefs.length === 0) {
    console.log('No drivers found. Seed failed.');
    process.exit(1);
  }

  // Clear assigned vehicles for drivers before re-assigning
  await Driver.updateMany({}, { $set: { assignedVehicle: null } });

  // 1. Bus 1
  const bus1 = new Vehicle({
    vehicleNumber: 'DL 01 AB 4321',
    vehicleType: 'Bus',
    vehicleCategory: 'AC Sleeper 2+1',
    vehicleModel: 'Volvo 9600 Multi-Axle',
    vehicleName: 'Royal Intercity Deluxe Express',
    ownerName: 'Platform Owner',
    ownerMobileNumber: '9999999999',
    assignedDriver: driverRefs[0]._id,
    vehicleStatus: 'Active',
    fareRate: 850,
    route: { origin: 'Delhi', destination: 'Jaipur' },
    busDetails: { busType: 'AC Sleeper', seatLayout: '2+1 Luxury Sleeper', availableSeats: 32 },
    seatingCapacity: 37,
    vehicleImages: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80']
  });
  await bus1.save();
  await Driver.findByIdAndUpdate(driverRefs[0]._id, { assignedVehicle: bus1._id });

  // 2. Bus 2
  const bus2 = new Vehicle({
    vehicleNumber: 'DL 02 CD 5678',
    vehicleType: 'Bus',
    vehicleCategory: 'AC Seater 2+2',
    vehicleModel: 'Ashok Leyland',
    vehicleName: 'Shivam Travels Premium',
    ownerName: 'Platform Owner',
    ownerMobileNumber: '9999999999',
    assignedDriver: driverRefs.length > 1 ? driverRefs[1]._id : driverRefs[0]._id,
    vehicleStatus: 'Active',
    fareRate: 750,
    route: { origin: 'Delhi', destination: 'Jaipur' },
    busDetails: { busType: 'AC Seater', seatLayout: '2+2 Pushback', availableSeats: 40 },
    seatingCapacity: 45,
    vehicleImages: ['https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80']
  });
  await bus2.save();
  if (driverRefs.length > 1) await Driver.findByIdAndUpdate(driverRefs[1]._id, { assignedVehicle: bus2._id });

  // 3. Bus 3
  const bus3 = new Vehicle({
    vehicleNumber: 'DL 03 EF 9012',
    vehicleType: 'Bus',
    vehicleCategory: 'Non-AC Sleeper 2+1',
    vehicleModel: 'Tata Marcopolo',
    vehicleName: 'Rajputana Express',
    ownerName: 'Platform Owner',
    ownerMobileNumber: '9999999999',
    assignedDriver: driverRefs.length > 2 ? driverRefs[2]._id : driverRefs[0]._id,
    vehicleStatus: 'Active',
    fareRate: 600,
    route: { origin: 'Delhi', destination: 'Jaipur' },
    busDetails: { busType: 'Non-AC Sleeper', seatLayout: '2+1 Sleeper', availableSeats: 30 },
    seatingCapacity: 35,
    vehicleImages: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80']
  });
  await bus3.save();
  if (driverRefs.length > 2) await Driver.findByIdAndUpdate(driverRefs[2]._id, { assignedVehicle: bus3._id });

  // 4. Car
  const car1 = new Vehicle({
    vehicleNumber: 'DL 04 GH 3456',
    vehicleType: 'Car',
    vehicleCategory: 'Sedan',
    vehicleModel: 'Swift Dzire',
    vehicleName: 'Comfort Ride',
    ownerName: 'Platform Owner',
    ownerMobileNumber: '9999999999',
    vehicleStatus: 'Active',
    fareRate: 1500,
    route: { origin: 'Delhi', destination: 'Jaipur' },
    carDetails: { ac: true, fuelType: 'Petrol' },
    seatingCapacity: 4,
    vehicleImages: ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80']
  });
  await car1.save();

  // 5. EV-Sewa
  const ev1 = new Vehicle({
    vehicleNumber: 'DL 05 IJ 7890',
    vehicleType: 'EV-Sewa',
    vehicleCategory: 'Electric Shuttle 12-Seater',
    vehicleModel: 'Tata Magic EV',
    vehicleName: 'Green City EV Shuttle',
    ownerName: 'Platform Owner',
    ownerMobileNumber: '9999999999',
    vehicleStatus: 'Active',
    fareRate: 50,
    route: { origin: 'Delhi', destination: 'Jaipur' },
    evDetails: { batteryCapacity: '72 kWh', rangeKm: 280 },
    seatingCapacity: 12,
    vehicleImages: ['https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80']
  });
  await ev1.save();

  // Create Schedules
  const vehicles = [bus1, bus2, bus3, car1, ev1];
  for (const v of vehicles) {
    const s = new Schedule({
      vehicle: v._id,
      driver: v.assignedDriver || driverRefs[0]._id, // use first driver if no driver assigned
      origin: v.route.origin,
      destination: v.route.destination,
      travelDate: new Date(),
      departureTime: '06:00 AM',
      fareRate: v.fareRate,
      status: 'Active'
    });
    await s.save();
  }

  // Get after counts
  const afterCounts = {};
  for (const name of collectionNames) {
    if (!name.startsWith('system.')) {
      afterCounts[name] = await mongoose.connection.db.collection(name).countDocuments();
    }
  }

  console.log('\n--- COLLECTION COUNTS AFTER ---');
  for (const name of Object.keys(beforeCounts)) {
    console.log(`${name}: ${beforeCounts[name]} -> ${afterCounts[name] || 0}`);
  }

  console.log('\nDatabase Reset & Seed Complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error in script:', err);
  process.exit(1);
});
