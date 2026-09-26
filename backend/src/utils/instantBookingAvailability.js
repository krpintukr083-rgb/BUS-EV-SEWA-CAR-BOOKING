const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Schedule = require('../models/Schedule');
const Vehicle = require('../models/Vehicle');
const { vehicleMatchesBookingRoute } = require('./notification');

const activeInstantBookingStatuses = [
  'Pending Admin Confirmation',
  'PENDING_ADMIN_CONFIRMATION',
  'Admin Confirmed',
  'ADMIN_CONFIRMED',
  'Pending',
  'Pending Driver Confirmation',
  'Awaiting Cash Collection',
  'Confirmed',
  'Ongoing'
];

const getAvailableInstantVehicleDrivers = async (
  serviceType,
  pickupLocation,
  dropLocation,
  selectedVehicles
) => {
  const vehicles = selectedVehicles || await Vehicle.find({
    vehicleType: serviceType,
    vehicleStatus: 'Active',
    vehicleSource: { $ne: 'THIRD_PARTY' }
  }).sort({ _id: 1 }).lean();
  const route = { pickupLocation, dropLocation };
  const matchingVehicles = vehicles.filter(vehicle =>
    vehicle.vehicleStatus === 'Active' &&
    vehicle.vehicleSource !== 'THIRD_PARTY' &&
    vehicle.vehicleType === serviceType &&
    vehicleMatchesBookingRoute(vehicle, route)
  );

  const busVehicles = matchingVehicles.filter(vehicle => vehicle.vehicleType === 'Bus');
  if (busVehicles.length) {
    const busVehicleIds = busVehicles.map(vehicle => vehicle._id);
    const [scheduledVehicleIds, activeScheduledVehicleIds] = await Promise.all([
      Schedule.distinct('vehicle', { vehicle: { $in: busVehicleIds } }),
      Schedule.distinct('vehicle', { vehicle: { $in: busVehicleIds }, status: 'Active' })
    ]);
    const scheduledSet = new Set(scheduledVehicleIds.map(id => String(id)));
    const activeScheduledSet = new Set(activeScheduledVehicleIds.map(id => String(id)));
    for (let index = matchingVehicles.length - 1; index >= 0; index -= 1) {
      const vehicle = matchingVehicles[index];
      if (
        vehicle.vehicleType === 'Bus' &&
        scheduledSet.has(String(vehicle._id)) &&
        !activeScheduledSet.has(String(vehicle._id))
      ) {
        matchingVehicles.splice(index, 1);
      }
    }
  }

  const candidatesByVehicle = await Promise.all(matchingVehicles.map(async vehicle => {
    const driverConditions = [{ assignedVehicle: vehicle._id }];
    if (vehicle.assignedDriver) driverConditions.push({ _id: vehicle.assignedDriver });
    const candidates = await Driver.find({
      driverStatus: 'Active',
      isOnline: true,
      $or: driverConditions
    }).populate('user', 'status').sort({ _id: 1 }).lean();
    const eligible = candidates.filter(driver => {
      const assignedVehicleId = driver.assignedVehicle ? String(driver.assignedVehicle) : null;
      const vehicleDriverId = vehicle.assignedDriver ? String(vehicle.assignedDriver) : null;
      return driver.user?.status !== 'Blocked'
        && (!assignedVehicleId || assignedVehicleId === String(vehicle._id))
        && (!vehicleDriverId || vehicleDriverId === String(driver._id));
    });
    return { vehicle, eligible };
  }));

  const eligibleDrivers = candidatesByVehicle.flatMap(({ eligible }) => eligible);
  const activeDriverIds = eligibleDrivers.length
    ? await Booking.distinct('driver', {
        driver: { $in: eligibleDrivers.map(driver => driver._id) },
        bookingStatus: { $in: activeInstantBookingStatuses },
        $or: [
          { travelDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          { rideStatus: { $in: ['Accepted', 'Arrived', 'Started'] } }
        ]
      })
    : [];
  const activeDriverSet = new Set(activeDriverIds.map(id => String(id)));

  return candidatesByVehicle.flatMap(({ vehicle, eligible }) => {
    const driver = eligible.find(candidate => !activeDriverSet.has(String(candidate._id)));
    return driver ? [{ vehicle, driver }] : [];
  });
};

module.exports = { getAvailableInstantVehicleDrivers };
