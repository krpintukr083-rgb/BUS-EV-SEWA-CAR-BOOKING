const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Schedule = require('../models/Schedule');
const Notification = require('../models/Notification');
const Driver = require('../models/Driver');
const getDriverVehicleOwnershipQuery = require('../utils/driverVehicleQuery');
const { validateRoutePricing } = require('../utils/routeFares');

const notifyDriver = async (driver, title, message, eventType, entityType, entityId) => {
  if (!driver) return;
  await Notification.create({
    title, message,
    recipient: `Driver: ${driver.name}`,
    recipientRole: 'driver',
    recipientId: driver.user || null,
    eventType,
    entityType,
    entityId
  });
};

const notifyAdmins = async (title, message, eventType, entityType, entityId) => {
  await Notification.create({
    title, message, recipient: 'All Admins', recipientRole: 'admin',
    eventType, entityType, entityId
  });
};

const driverId = req => req.driver && req.driver._id;
const isMissingNumericValue = value => value == null || (typeof value === 'string' && value.trim() === '');

exports.registerVehicle = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.vehicleNumber || !body.vehicleType) {
      return res.status(400).json({ success: false, message: 'vehicleNumber and vehicleType are required' });
    }
    if (body.vehicleType === 'EV-Sewa') {
      const batteryCapacity = Number(body.evDetails && body.evDetails.batteryCapacity);
      const batteryPercentage = Number(body.evDetails && body.evDetails.batteryPercentage);
      const rangeKm = Number(body.evDetails && body.evDetails.rangeKm);
      if (
        isMissingNumericValue(body.evDetails?.batteryCapacity) ||
        !Number.isFinite(batteryCapacity) ||
        batteryCapacity <= 0
      ) {
        return res.status(400).json({ success: false, message: 'EV battery capacity must be a valid positive number in kWh' });
      }
      if (
        isMissingNumericValue(body.evDetails?.batteryPercentage) ||
        !Number.isFinite(batteryPercentage) ||
        batteryPercentage < 0 ||
        batteryPercentage > 100
      ) {
        return res.status(400).json({ success: false, message: 'EV battery percentage must be between 0 and 100' });
      }
      if (
        isMissingNumericValue(body.evDetails?.rangeKm) ||
        !Number.isFinite(rangeKm) ||
        rangeKm < 0
      ) {
        return res.status(400).json({ success: false, message: 'EV estimated range must be a valid non-negative number' });
      }
      body.evDetails = { ...body.evDetails, batteryCapacity, batteryPercentage, rangeKm };
    }
    if (body.route?.stops?.length) {
      const routePricing = validateRoutePricing(body.route);
      if (!routePricing.valid) {
        return res.status(400).json({ success: false, message: routePricing.message });
      }
      body.fareRate = routePricing.totalFare;
    } else if (body.fareRate != null && (
      !Number.isFinite(Number(body.fareRate)) ||
      Number(body.fareRate) <= 0
    )) {
      return res.status(400).json({ success: false, message: 'A positive full-route fare is required when route stops are not configured.' });
    }
    const vehicleNumber = String(body.vehicleNumber).trim().toUpperCase();
    if (await Vehicle.exists({ vehicleNumber })) {
      return res.status(409).json({ success: false, message: 'Vehicle with this number already exists' });
    }
    const vehicle = await Vehicle.create({
      ...body,
      vehicleNumber,
      vehicleCategory: body.vehicleCategory || 'Driver Submitted Vehicle',
      vehicleModel: body.vehicleModel || 'Driver Submitted Model',
      vehicleName: body.vehicleName || vehicleNumber,
      ownerName: body.ownerName || req.driver.name,
      ownerMobileNumber: body.ownerMobileNumber || req.driver.mobileNumber,
      vehicleImages: Array.isArray(body.vehicleImages) ? body.vehicleImages.slice(0, 5) : [],
      vehicleStatus: 'Pending',
      assignedDriver: req.driver._id,
      submission: { submittedByDriver: req.driver._id }
    });
    await notifyAdmins(
      'Vehicle approval required',
      `${req.driver.name} submitted vehicle ${vehicle.vehicleNumber} for approval.`,
      'VEHICLE_SUBMITTED', 'Vehicle', vehicle._id
    );
    res.status(201).json({ success: true, data: vehicle, message: 'Vehicle submitted for approval' });
  } catch (error) { next(error); }
};

exports.getDriverVehicles = async (req, res, next) => {
  try {
    const data = await Vehicle.find(getDriverVehicleOwnershipQuery(req.driver)).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
};

exports.updateDriverVehicleEVDetails = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { batteryPercentage, estimatedRangeKm } = req.body || {};
    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicleId' });
    }

    const battery = Number(batteryPercentage);
    const rangeKm = Number(estimatedRangeKm);
    if (
      isMissingNumericValue(batteryPercentage) ||
      !Number.isFinite(battery) ||
      battery < 0 ||
      battery > 100
    ) {
      return res.status(400).json({ success: false, message: 'EV battery percentage must be between 0 and 100' });
    }
    if (
      isMissingNumericValue(estimatedRangeKm) ||
      !Number.isFinite(rangeKm) ||
      rangeKm <= 0
    ) {
      return res.status(400).json({ success: false, message: 'EV estimated range must be a valid positive number' });
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      vehicleType: 'EV-Sewa',
      ...getDriverVehicleOwnershipQuery(req.driver)
    });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'EV vehicle not found or you are not authorized to edit it' });
    }

    vehicle.set('evDetails.batteryPercentage', battery);
    vehicle.set('evDetails.rangeKm', rangeKm);
    await vehicle.save();
    res.json({ success: true, data: vehicle, message: 'EV battery and range updated successfully' });
  } catch (error) { next(error); }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.vehicle || !body.origin || !body.destination || !body.travelDate || !body.departureTime || !body.arrivalTime) {
      return res.status(400).json({ success: false, message: 'vehicle, origin, destination, travelDate, departureTime, and arrivalTime are required' });
    }
    const vehicle = await Vehicle.findOne({ _id: body.vehicle, assignedDriver: req.driver._id });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle is not assigned to this driver' });
    if (vehicle.vehicleStatus !== 'Active') {
      return res.status(400).json({ success: false, message: 'Only an active vehicle can have a schedule' });
    }

    const startOfDay = new Date(body.travelDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(body.travelDate);
    endOfDay.setHours(23, 59, 59, 999);

    const duplicate = await Schedule.findOne({
      vehicle: vehicle._id,
      departureTime: body.departureTime,
      travelDate: { $gte: startOfDay, $lte: endOfDay }
    });

    if (duplicate) {
      return res.status(409).json({ success: false, message: 'A schedule for this vehicle on this date and time already exists.' });
    }

    const schedule = await Schedule.create({
      ...body, driver: req.driver._id, status: 'Pending',
      fareRate: Number(body.fareRate) || vehicle.fareRate || 0
    });
    await notifyAdmins(
      'Schedule approval required',
      `${req.driver.name} submitted ${schedule.origin} → ${schedule.destination} for approval.`,
      'SCHEDULE_SUBMITTED', 'Schedule', schedule._id
    );
    res.status(201).json({ success: true, data: schedule, message: 'Schedule submitted for approval' });
  } catch (error) { next(error); }
};

exports.getDriverSchedules = async (req, res, next) => {
  try {
    const data = await Schedule.find({ driver: driverId(req) }).populate('vehicle').sort({ travelDate: 1 }).lean();
    res.json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
};

exports.getActiveSchedules = async (req, res, next) => {
  try {
    const { from, to, travelDate } = req.query;
    const filter = { status: 'Active' };

    if (travelDate) {
      const startOfDay = new Date(travelDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(travelDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.travelDate = { $gte: startOfDay, $lte: endOfDay };
    }

    let data = await Schedule.find(filter).populate({
      path: 'vehicle', match: { vehicleStatus: 'Active' }, populate: { path: 'assignedDriver' }
    }).sort({ travelDate: 1, departureTime: 1 }).lean();
    if (from || to) {
      const { isRouteSegmentWithin, normalizeLocation } = require('../utils/routeFares');
      data = data.filter(schedule => {
        if (!schedule.vehicle) return false;
        const route = schedule.vehicle.route;
        if (Array.isArray(route?.stops) && route.stops.length > 0) {
          return isRouteSegmentWithin(route, schedule.origin, schedule.destination, from || schedule.origin, to || schedule.destination);
        }
        const originMatches = !from || normalizeLocation(schedule.origin).includes(normalizeLocation(from));
        const destinationMatches = !to || normalizeLocation(schedule.destination).includes(normalizeLocation(to));
        return originMatches && destinationMatches;
      });
    }
    res.json({ success: true, count: data.filter(s => s.vehicle).length, data: data.filter(s => s.vehicle) });
  } catch (error) { next(error); }
};

const review = (kind, status) => async (req, res, next) => {
  try {
    const Model = kind === 'vehicle' ? Vehicle : Schedule;
    const doc = await Model.findById(req.params.id).populate(kind === 'vehicle' ? 'submission.submittedByDriver' : 'driver');
    if (!doc) return res.status(404).json({ success: false, message: `${kind} not found` });
    const reason = req.body && (req.body.reason || req.body.rejectionReason) || '';
    if (kind === 'vehicle') {
      doc.vehicleStatus = status;
      doc.submission.reviewedBy = req.user._id;
      doc.submission.reviewedAt = new Date();
      doc.submission.rejectionReason = status === 'Rejected' ? reason : '';
    } else {
      doc.status = status;
      doc.reviewedBy = req.user._id;
      doc.reviewedAt = new Date();
      doc.rejectionReason = status === 'Rejected' ? reason : '';
    }
    await doc.save();
    if (kind === 'vehicle' && status === 'Active') {
      await Driver.findByIdAndUpdate(doc.assignedDriver, { assignedVehicle: doc._id });
    }
    const driver = kind === 'vehicle' ? doc.submission.submittedByDriver : doc.driver;
    const eventType = `${kind.toUpperCase()}_${status === 'Active' ? 'APPROVED' : 'REJECTED'}`;
    await notifyDriver(
      driver,
      `${kind} ${status.toLowerCase()}`,
      status === 'Rejected' ? `Rejected: ${reason}` : `Your ${kind} was approved.`,
      eventType,
      kind === 'vehicle' ? 'Vehicle' : 'Schedule',
      doc._id
    );
    res.json({ success: true, data: doc, message: `${kind} ${status.toLowerCase()}` });
  } catch (error) { next(error); }
};

exports.getPendingVehicles = async (req, res, next) => {
  try { const data = await Vehicle.find({ vehicleStatus: 'Pending' }).populate('assignedDriver').sort({ createdAt: 1 }); res.json({ success: true, count: data.length, data }); } catch (e) { next(e); }
};
exports.getPendingSchedules = async (req, res, next) => {
  req.query.status = 'Pending';
  return exports.getAdminSchedules(req, res, next);
};
exports.getAdminSchedules = async (req, res, next) => {
  try {
    const status = req.query.status || 'Pending';
    if (!['Pending', 'Active', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid schedule status' });
    }
    const data = await Schedule.find({ status })
      .select('vehicle driver origin destination departureTime arrivalTime fareRate notes status rejectionReason createdAt updatedAt')
      .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleStatus seatingCapacity')
      .populate('driver', 'name mobileNumber driverStatus')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
};
exports.approveVehicle = review('vehicle', 'Active');
exports.rejectVehicle = review('vehicle', 'Rejected');
exports.approveSchedule = review('schedule', 'Active');
exports.rejectSchedule = review('schedule', 'Rejected');
