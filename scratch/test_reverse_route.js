const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const Driver = require('../backend/src/models/Driver');
const Vehicle = require('../backend/src/models/Vehicle');
const User = require('../backend/src/models/User');

async function testReverseRouteFlow() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-booking';
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB');

    let driver = await Driver.findOne({ assignedVehicle: { $ne: null } }).populate('assignedVehicle');
    if (!driver) {
      driver = await Driver.findOne().populate('assignedVehicle');
    }
    if (!driver) {
      console.error('No driver found in database');
      return process.exit(1);
    }

    if (!driver.assignedVehicle) {
      // Find a vehicle and assign it for test
      const vehicle = await Vehicle.findOne();
      if (!vehicle) {
        console.error('No vehicle found in database');
        return process.exit(1);
      }
      driver.assignedVehicle = vehicle;
    }

    const vehicleId = driver.assignedVehicle._id;
    console.log(`[TEST] Found Driver (${driver.name}), Vehicle ID: ${vehicleId}`);
    
    // Set initial route if missing
    if (!driver.assignedVehicle.route?.origin || !driver.assignedVehicle.route?.destination) {
      driver.assignedVehicle.route = { origin: 'Jaipur', destination: 'Delhi' };
      await driver.assignedVehicle.save();
    }
    
    console.log(`[TEST] Initial Vehicle Route: ${driver.assignedVehicle.route.origin} -> ${driver.assignedVehicle.route.destination}`);
    console.log(`[TEST] Initial Driver Route: ${driver.route?.origin || 'N/A'} -> ${driver.route?.destination || 'N/A'}`);

    // TEST 1: Reverse Jaipur -> Delhi => Delhi -> Jaipur
    const origFrom = driver.assignedVehicle.route.origin;
    const origTo = driver.assignedVehicle.route.destination;
    const targetFrom = origTo;
    const targetTo = origFrom;

    console.log(`\n--- STEP 1: Reversing ${origFrom} -> ${origTo} to ${targetFrom} -> ${targetTo} ---`);

    const updatedVehicle1 = await Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        $set: {
          'route.origin': targetFrom,
          'route.destination': targetTo,
        }
      },
      { new: true }
    );

    await Driver.findByIdAndUpdate(
      driver._id,
      {
        $set: {
          'route.origin': targetFrom,
          'route.destination': targetTo,
        }
      }
    );

    const recheckedDriver1 = await Driver.findById(driver._id);

    console.log(`[VERIFY 1] Vehicle Route is now: ${updatedVehicle1.route.origin} -> ${updatedVehicle1.route.destination}`);
    console.log(`[VERIFY 1] Driver Route is now: ${recheckedDriver1.route.origin} -> ${recheckedDriver1.route.destination}`);

    const pass1 = updatedVehicle1.route.origin === targetFrom &&
                  updatedVehicle1.route.destination === targetTo &&
                  recheckedDriver1.route.origin === targetFrom &&
                  recheckedDriver1.route.destination === targetTo;

    console.log(`[RESULT 1] ${pass1 ? 'PASS: Route successfully reversed to ' + targetFrom + ' -> ' + targetTo : 'FAIL'}`);

    // TEST 2: Reverse back Delhi -> Jaipur => Jaipur -> Delhi
    console.log(`\n--- STEP 2: Reversing back ${targetFrom} -> ${targetTo} to ${origFrom} -> ${origTo} ---`);

    const updatedVehicle2 = await Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        $set: {
          'route.origin': origFrom,
          'route.destination': origTo,
        }
      },
      { new: true }
    );

    await Driver.findByIdAndUpdate(
      driver._id,
      {
        $set: {
          'route.origin': origFrom,
          'route.destination': origTo,
        }
      }
    );

    const recheckedDriver2 = await Driver.findById(driver._id);

    console.log(`[VERIFY 2] Vehicle Route restored to: ${updatedVehicle2.route.origin} -> ${updatedVehicle2.route.destination}`);
    console.log(`[VERIFY 2] Driver Route restored to: ${recheckedDriver2.route.origin} -> ${recheckedDriver2.route.destination}`);

    const pass2 = updatedVehicle2.route.origin === origFrom &&
                  updatedVehicle2.route.destination === origTo &&
                  recheckedDriver2.route.origin === origFrom &&
                  recheckedDriver2.route.destination === origTo;

    console.log(`[RESULT 2] ${pass2 ? 'PASS: Route successfully restored to ' + origFrom + ' -> ' + origTo : 'FAIL'}`);

    if (pass1 && pass2) {
      console.log('\n=== ALL REVERSE ROUTE PERSISTENCE TESTS PASSED ===');
    } else {
      console.log('\n=== REVERSE ROUTE PERSISTENCE TEST FAILED ===');
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testReverseRouteFlow();
