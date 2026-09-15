const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Cancellation = require('../models/Cancellation');
const Compensation = require('../models/Compensation');
const Insurance = require('../models/Insurance');
const Notification = require('../models/Notification');
const Support = require('../models/Support');
const Policy = require('../models/Policy');
const ServiceControl = require('../models/ServiceControl');
const { dashboardCache } = require('../utils/cache');

// ==========================================
// 1. ADMIN DASHBOARD
// ==========================================
exports.getDashboardStats = async (req, res, next) => {
  try {
    const cachedData = dashboardCache.get('admin_dashboard_stats');
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData
      });
    }

    const [
      customersCount,
      driversCount,
      vehiclesCount,
      activeVehiclesCount,
      inactiveVehiclesCount,
      blockedVehiclesCount,
      bookingsCount,
      paymentAggregate,
      pendingDriverVerificationCount,
      pendingDocumentsCount,
      cancellationRecordsCount,
      compensationRecordsCount,
      insuranceRecordsCount,
      serviceControlDoc,
      recentBookings
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Driver.countDocuments(),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ vehicleStatus: 'Active' }),
      Vehicle.countDocuments({ vehicleStatus: 'Inactive' }),
      Vehicle.countDocuments({ vehicleStatus: 'Blocked' }),
      Booking.countDocuments(),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalPaymentsAmount: { $sum: '$bookingAmount' },
            paymentsCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Successful'] }, 1, 0] }
            }
          }
        }
      ]),
      Driver.countDocuments({
        $or: [
          { drivingLicenceStatus: 'Pending' },
          { rcStatus: 'Pending' },
          { insuranceStatus: 'Pending' },
          { fitnessStatus: 'Pending' }
        ]
      }),
      Driver.countDocuments({
        $or: [{ drivingLicenceStatus: 'Pending' }, { rcStatus: 'Pending' }]
      }),
      Cancellation.countDocuments(),
      Compensation.countDocuments(),
      Insurance.countDocuments(),
      ServiceControl.findOne().lean(),
      Booking.find()
        .select('bookingId customer serviceType pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus travelDate createdAt vehicle driver')
        .populate('vehicle', 'vehicleName vehicleNumber vehicleType vehicleCategory seatingCapacity vehicleStatus')
        .populate('driver', 'name mobileNumber profilePhoto driverStatus')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    ]);

    let serviceControl = serviceControlDoc;
    if (!serviceControl) {
      serviceControl = await ServiceControl.create({
        busService: 'Active',
        evSewaService: 'Active',
        carService: 'Active'
      });
    }

    const totalPaymentsAmount = paymentAggregate.length > 0 ? (paymentAggregate[0].totalPaymentsAmount || 0) : 0;
    const paymentsCount = paymentAggregate.length > 0 ? (paymentAggregate[0].paymentsCount || 0) : 0;

    const responsePayload = {
      counts: {
        customers: customersCount,
        drivers: driversCount,
        vehicles: vehiclesCount,
        activeVehicles: activeVehiclesCount,
        inactiveVehicles: inactiveVehiclesCount,
        blockedVehicles: blockedVehiclesCount,
        bookings: bookingsCount,
        paymentsCount,
        totalPaymentsAmount,
        pendingDriverVerification: pendingDriverVerificationCount,
        pendingDocuments: pendingDocumentsCount,
        cancellationRecords: cancellationRecordsCount,
        compensationRecords: compensationRecordsCount,
        accidentInsuranceRecords: insuranceRecordsCount
      },
      serviceControl,
      recentBookings
    };

    // Cache non-sensitive aggregate metrics for 30 seconds
    dashboardCache.set('admin_dashboard_stats', responsePayload, 30000);

    res.json({
      success: true,
      data: responsePayload
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CUSTOMER MANAGEMENT
// ==========================================
exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });

    const customersWithBookingStats = await Promise.all(
      customers.map(async customer => {
        const bookingsCount = await Booking.countDocuments({ 'customer.phone': customer.phone });
        const totalSpentResult = await Booking.aggregate([
          { $match: { 'customer.phone': customer.phone, paymentStatus: 'Successful' } },
          { $group: { _id: null, total: { $sum: '$fare' } } }
        ]);
        const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].total : 0;

        return {
          id: customer._id,
          name: customer.name,
          mobileNumber: customer.phone,
          email: customer.email,
          bookingRecordsCount: bookingsCount,
          totalSpent,
          accountStatus: customer.status,
          createdAt: customer.createdAt
        };
      })
    );

    res.json({ success: true, count: customersWithBookingStats.length, data: customersWithBookingStats });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const customer = await User.findById(req.params.id);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.status = status;
    await customer.save();
    res.json({ success: true, message: `Customer status updated to ${status}`, data: customer });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. DRIVER MANAGEMENT & VERIFICATION
// ==========================================
exports.getDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find().populate('assignedVehicle').populate('user').sort({ createdAt: -1 });
    res.json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    next(error);
  }
};

exports.addDriver = async (req, res, next) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      password,
      drivingLicenceNumber,
      rcNumber,
      insurancePolicyNumber,
      fitnessDetails,
      assignedVehicle
    } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { phone: mobileNumber }] });
    if (user) {
      return res.status(400).json({ success: false, message: 'Driver with this email or mobile number already exists' });
    }

    user = await User.create({
      name,
      email,
      phone: mobileNumber,
      password: password || 'Driver@123',
      role: 'driver',
      status: 'Active'
    });

    const driver = await Driver.create({
      user: user._id,
      name,
      mobileNumber,
      drivingLicenceNumber,
      rcNumber: rcNumber || '',
      insurancePolicyNumber: insurancePolicyNumber || '',
      fitnessDetails: fitnessDetails || 'State Transport Safety Certified',
      assignedVehicle: assignedVehicle || null,
      driverStatus: 'Active',
      drivingLicenceStatus: 'Approved',
      rcStatus: 'Approved',
      insuranceStatus: 'Approved',
      fitnessStatus: 'Approved'
    });

    // If assigned vehicle was selected, link driver to vehicle
    if (assignedVehicle) {
      await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedDriver: driver._id });
    }

    res.status(201).json({ success: true, message: 'Driver added successfully', data: driver });
  } catch (error) {
    next(error);
  }
};

exports.updateDriver = async (req, res, next) => {
  try {
    const { name, mobileNumber, driverStatus, assignedVehicle, drivingLicenceNumber } = req.body;
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    if (name) driver.name = name;
    if (mobileNumber) driver.mobileNumber = mobileNumber;
    if (driverStatus) driver.driverStatus = driverStatus;
    if (drivingLicenceNumber) driver.drivingLicenceNumber = drivingLicenceNumber;

    if (assignedVehicle !== undefined) {
      // Clear old vehicle assignedDriver
      if (driver.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(driver.assignedVehicle, { assignedDriver: null });
      }
      driver.assignedVehicle = assignedVehicle || null;
      if (assignedVehicle) {
        await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedDriver: driver._id });
      }
    }

    await driver.save();
    res.json({ success: true, message: 'Driver updated successfully', data: driver });
  } catch (error) {
    next(error);
  }
};

exports.verifyDriverDocuments = async (req, res, next) => {
  try {
    const { drivingLicenceStatus, rcStatus, insuranceStatus, fitnessStatus, rejectionReason } = req.body;
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    if (drivingLicenceStatus) driver.drivingLicenceStatus = drivingLicenceStatus;
    if (rcStatus) driver.rcStatus = rcStatus;
    if (insuranceStatus) driver.insuranceStatus = insuranceStatus;
    if (fitnessStatus) driver.fitnessStatus = fitnessStatus;
    if (rejectionReason !== undefined) driver.rejectionReason = rejectionReason;

    await driver.save();
    res.json({ success: true, message: 'Driver document verification status updated', data: driver });
  } catch (error) {
    next(error);
  }
};

exports.updateDriverStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Active, Inactive, or Blocked' });
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.driverStatus = status;
    await driver.save();

    // Also sync user model status
    await User.findByIdAndUpdate(driver.user, { status });

    res.json({ success: true, message: `Driver status changed to ${status}`, data: driver });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. VEHICLE MANAGEMENT (BUS, EV-SEWA, CAR)
// ==========================================
exports.getVehicles = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = {};
    if (type) query.vehicleType = type;

    const vehicles = await Vehicle.find(query).populate('assignedDriver').sort({ createdAt: -1 });
    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    next(error);
  }
};

exports.addVehicle = async (req, res, next) => {
  try {
    const {
      vehicleNumber,
      vehicleType,
      vehicleCategory,
      vehicleModel,
      vehicleName,
      seatingCapacity,
      ownerName,
      ownerMobileNumber,
      assignedDriver,
      rcNumber,
      rcDocument,
      insurancePolicyNumber,
      insuranceDocument,
      insuranceExpiryDetails,
      fitnessDetails,
      fitnessDocument,
      vehicleImages,
      fareRate,
      route,
      pickupDropDetails,
      vehicleStatus,
      busDetails,
      evDetails,
      carDetails
    } = req.body;

    const existingVehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase().trim() });
    if (existingVehicle) {
      return res.status(400).json({ success: false, message: 'Vehicle with this number already exists' });
    }

    const vehicle = await Vehicle.create({
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      vehicleType,
      vehicleCategory,
      vehicleModel,
      vehicleName,
      seatingCapacity,
      ownerName,
      ownerMobileNumber,
      assignedDriver: assignedDriver || null,
      rcNumber,
      rcDocument: rcDocument || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber,
      insuranceDocument: insuranceDocument || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: insuranceExpiryDetails || '2026-12-31',
      fitnessDetails: fitnessDetails || 'State Transport Certified Fitness Valid',
      fitnessDocument: fitnessDocument || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      vehicleImages: vehicleImages && vehicleImages.length > 0 ? vehicleImages : [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
      ],
      fareRate: fareRate || 500,
      route: route || { origin: '', destination: '', boardingPoints: [], droppingPoints: [] },
      pickupDropDetails: pickupDropDetails || { pickupLocation: '', dropLocation: '' },
      vehicleStatus: vehicleStatus || 'Active',
      busDetails: busDetails || { busType: 'AC Sleeper', seatLayout: '2+1 Luxury Sleeper', availableSeats: seatingCapacity },
      evDetails: evDetails || { batteryCapacity: '72 kWh', rangeKm: 280 },
      carDetails: carDetails || { ac: true, fuelType: 'Electric / Hybrid' }
    });

    if (assignedDriver) {
      await Driver.findByIdAndUpdate(assignedDriver, { assignedVehicle: vehicle._id });
    }

    res.status(201).json({ success: true, message: 'Vehicle added successfully', data: vehicle });
  } catch (error) {
    next(error);
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    if (req.body.assignedDriver !== undefined) {
      if (req.body.assignedDriver) {
        await Driver.findByIdAndUpdate(req.body.assignedDriver, { assignedVehicle: vehicle._id });
      }
    }

    res.json({ success: true, message: 'Vehicle updated successfully', data: vehicle });
  } catch (error) {
    next(error);
  }
};

exports.updateVehicleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Active, Inactive, or Blocked' });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    vehicle.vehicleStatus = status;
    await vehicle.save();

    res.json({
      success: true,
      message: `Vehicle status updated to ${status}. ${
        status !== 'Active' ? 'Inactive or Blocked vehicles will not be available for new bookings.' : ''
      }`,
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. SPECIFIC SERVICE VEHICLE LISTINGS
// ==========================================
exports.getBuses = async (req, res, next) => {
  try {
    const buses = await Vehicle.find({ vehicleType: 'Bus' }).populate('assignedDriver').sort({ createdAt: -1 });

    const busesWithStats = await Promise.all(
      buses.map(async bus => {
        const bookings = await Booking.find({ vehicle: bus._id });
        const passengersCount = bookings.reduce((sum, b) => sum + (b.passengerDetails ? b.passengerDetails.length : 0), 0);
        const cancellationsCount = await Cancellation.countDocuments({ booking: { $in: bookings.map(b => b._id) } });

        return {
          ...bus.toObject(),
          totalBookingsCount: bookings.length,
          totalPassengersServed: passengersCount,
          cancellationsCount,
          availableSeats: bus.busDetails ? bus.busDetails.availableSeats : bus.seatingCapacity
        };
      })
    );

    res.json({ success: true, count: busesWithStats.length, data: busesWithStats });
  } catch (error) {
    next(error);
  }
};

exports.getEvSewa = async (req, res, next) => {
  try {
    const evs = await Vehicle.find({ vehicleType: 'EV-Sewa' }).populate('assignedDriver').sort({ createdAt: -1 });

    const evsWithStats = await Promise.all(
      evs.map(async ev => {
        const bookings = await Booking.find({ vehicle: ev._id }).sort({ createdAt: -1 }).limit(5);
        return {
          ...ev.toObject(),
          recentBookings: bookings
        };
      })
    );

    res.json({ success: true, count: evsWithStats.length, data: evsWithStats });
  } catch (error) {
    next(error);
  }
};

exports.getCars = async (req, res, next) => {
  try {
    const cars = await Vehicle.find({ vehicleType: 'Car' }).populate('assignedDriver').sort({ createdAt: -1 });

    const carsWithStats = await Promise.all(
      cars.map(async car => {
        const bookings = await Booking.find({ vehicle: car._id }).sort({ createdAt: -1 }).limit(5);
        return {
          ...car.toObject(),
          recentBookings: bookings
        };
      })
    );

    res.json({ success: true, count: carsWithStats.length, data: carsWithStats });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. DRIVER ASSIGNMENT
// ==========================================
exports.getDriverAssignments = async (req, res, next) => {
  try {
    const [vehicles, drivers] = await Promise.all([
      Vehicle.find()
        .select('vehicleNumber vehicleName vehicleType assignedDriver')
        .populate('assignedDriver', 'name mobileNumber driverStatus profilePhoto')
        .lean(),
      Driver.find({ driverStatus: 'Active' })
        .select('name mobileNumber driverStatus profilePhoto')
        .lean()
    ]);

    const assignmentList = vehicles.map(v => ({
      vehicleId: v._id,
      vehicleNumber: v.vehicleNumber,
      vehicleName: v.vehicleName,
      vehicleType: v.vehicleType,
      currentDriver: v.assignedDriver
        ? {
            id: v.assignedDriver._id,
            name: v.assignedDriver.name,
            mobileNumber: v.assignedDriver.mobileNumber,
            driverStatus: v.assignedDriver.driverStatus
          }
        : null,
      assignmentStatus: v.assignedDriver ? 'Assigned' : 'Unassigned'
    }));

    res.json({ success: true, data: { assignments: assignmentList, availableDrivers: drivers } });
  } catch (error) {
    next(error);
  }
};

exports.assignDriverToVehicle = async (req, res, next) => {
  try {
    const { vehicleId, driverId } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    // If unassigning
    if (!driverId) {
      if (vehicle.assignedDriver) {
        await Driver.findByIdAndUpdate(vehicle.assignedDriver, { assignedVehicle: null });
      }
      vehicle.assignedDriver = null;
      await vehicle.save();
      return res.json({ success: true, message: 'Driver unassigned from vehicle', data: vehicle });
    }

    const newDriver = await Driver.findById(driverId);
    if (!newDriver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // Remove new driver from previous vehicle if any
    if (newDriver.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(newDriver.assignedVehicle, { assignedDriver: null });
    }

    // Remove old driver from this vehicle if any
    if (vehicle.assignedDriver) {
      await Driver.findByIdAndUpdate(vehicle.assignedDriver, { assignedVehicle: null });
    }

    // Set new assignment
    vehicle.assignedDriver = newDriver._id;
    await vehicle.save();

    newDriver.assignedVehicle = vehicle._id;
    await newDriver.save();

    res.json({
      success: true,
      message: `Driver ${newDriver.name} successfully assigned to vehicle ${vehicle.vehicleNumber}`,
      data: { vehicle, driver: newDriver }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. COMPLIANCE & DOCUMENT RECORDS
// ==========================================
exports.getDocumentRecords = async (req, res, next) => {
  try {
    const { recordType } = req.params; // rc, licence, insurance, fitness

    const drivers = await Driver.find().populate('assignedVehicle');
    const vehicles = await Vehicle.find().populate('assignedDriver');

    let records = [];

    if (recordType === 'rc') {
      records = vehicles.map(v => ({
        id: v._id,
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName,
        ownerName: v.ownerName,
        rcNumber: v.rcNumber,
        documentUrl: v.rcDocument,
        assignedDriver: v.assignedDriver ? v.assignedDriver.name : 'Unassigned',
        status: v.vehicleStatus
      }));
    } else if (recordType === 'licence') {
      records = drivers.map(d => ({
        id: d._id,
        driverName: d.name,
        mobileNumber: d.mobileNumber,
        drivingLicenceNumber: d.drivingLicenceNumber,
        documentUrl: d.drivingLicenceDoc,
        status: d.drivingLicenceStatus,
        driverStatus: d.driverStatus
      }));
    } else if (recordType === 'insurance') {
      records = vehicles.map(v => ({
        id: v._id,
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName,
        policyNumber: v.insurancePolicyNumber,
        expiryDate: v.insuranceExpiryDetails,
        documentUrl: v.insuranceDocument,
        status: v.vehicleStatus
      }));
    } else if (recordType === 'fitness') {
      records = vehicles.map(v => ({
        id: v._id,
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName,
        fitnessDetails: v.fitnessDetails,
        documentUrl: v.fitnessDocument,
        status: v.vehicleStatus
      }));
    }

    res.json({ success: true, recordType, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. BOOKING MANAGEMENT
// ==========================================
exports.getBookings = async (req, res, next) => {
  try {
    const { serviceType, status } = req.query;
    const filter = {};
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.bookingStatus = status;

    const bookings = await Booking.find(filter)
      .populate('vehicle')
      .populate('driver')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    await booking.save();
    res.json({ success: true, message: 'Booking status updated', data: booking });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. PAYMENT MANAGEMENT
// ==========================================
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('booking')
      .populate('driver')
      .sort({ createdAt: -1 });

    const totalRevenue = payments.reduce((acc, curr) => acc + (curr.bookingAmount || 0), 0);
    const totalDriverPayouts = payments.reduce((acc, curr) => acc + (curr.driverPayment || 0), 0);

    res.json({
      success: true,
      summary: {
        totalTransactions: payments.length,
        totalRevenue,
        totalDriverPayouts
      },
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 10. CANCELLATION MANAGEMENT
// ==========================================
exports.getCancellations = async (req, res, next) => {
  try {
    const cancellations = await Cancellation.find().populate('booking').sort({ createdAt: -1 });
    res.json({ success: true, count: cancellations.length, data: cancellations });
  } catch (error) {
    next(error);
  }
};

exports.processCancellationRefund = async (req, res, next) => {
  try {
    const cancellation = await Cancellation.findById(req.params.id);
    if (!cancellation) return res.status(404).json({ success: false, message: 'Cancellation record not found' });

    cancellation.refundStatus = 'Processed';
    cancellation.cancellationStatus = 'Completed';
    await cancellation.save();

    // Also update booking status
    if (cancellation.booking) {
      await Booking.findByIdAndUpdate(cancellation.booking, {
        cancellationStatus: 'Refunded',
        paymentStatus: 'Refunded'
      });
    }

    res.json({ success: true, message: 'Cancellation refund marked as processed', data: cancellation });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 11. 3% CUSTOMER SERVICE COMPENSATION MANAGEMENT
// (Verified Platform/Service-side Technical Glitch)
// ==========================================
exports.getCompensations = async (req, res, next) => {
  try {
    const compensations = await Compensation.find().populate('booking').sort({ createdAt: -1 });
    res.json({ success: true, count: compensations.length, data: compensations });
  } catch (error) {
    next(error);
  }
};

exports.updateCompensationStatus = async (req, res, next) => {
  try {
    const { approvalStatus, refundStatus, paymentReference } = req.body;
    const compensation = await Compensation.findById(req.params.id);
    if (!compensation) return res.status(404).json({ success: false, message: 'Compensation record not found' });

    if (approvalStatus) compensation.approvalStatus = approvalStatus;
    if (refundStatus) compensation.refundStatus = refundStatus;
    if (paymentReference) compensation.paymentReference = paymentReference;

    await compensation.save();
    res.json({ success: true, message: '3% Technical Glitch Compensation updated', data: compensation });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 12. ACCIDENT INSURANCE RECORDS
// ==========================================
exports.getInsuranceRecords = async (req, res, next) => {
  try {
    const records = await Insurance.find().populate('booking').sort({ createdAt: -1 });
    res.json({
      success: true,
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.',
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInsuranceClaimStatus = async (req, res, next) => {
  try {
    const { claimStatus, activeStatus } = req.body;
    const record = await Insurance.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Insurance record not found' });

    if (claimStatus) record.claimStatus = claimStatus;
    if (activeStatus) record.activeStatus = activeStatus;

    await record.save();
    res.json({ success: true, message: 'Insurance claim status updated', data: record });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 13. NOTIFICATIONS
// ==========================================
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    next(error);
  }
};

exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, recipient, recipientRole } = req.body;
    const notification = await Notification.create({
      title,
      message,
      recipient: recipient || 'All Users',
      recipientRole: recipientRole || 'all',
      status: 'Unread'
    });
    res.status(201).json({ success: true, message: 'Notification created', data: notification });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 14. CUSTOMER SUPPORT TICKETS
// ==========================================
exports.getSupportTickets = async (req, res, next) => {
  try {
    const tickets = await Support.find().sort({ createdAt: -1 });
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    next(error);
  }
};

exports.updateSupportTicket = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const ticket = await Support.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Support ticket not found' });

    if (status) ticket.status = status;
    if (resolutionNotes !== undefined) ticket.resolutionNotes = resolutionNotes;

    await ticket.save();
    res.json({ success: true, message: 'Support ticket updated', data: ticket });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 15. TERMS & POLICIES
// ==========================================
exports.getPolicies = async (req, res, next) => {
  try {
    const policies = await Policy.find().sort({ policyType: 1 });
    res.json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    next(error);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    const { policyType } = req.params;
    const { title, content } = req.body;

    let policy = await Policy.findOne({ policyType });
    if (!policy) {
      policy = await Policy.create({
        policyType,
        title,
        content,
        lastUpdated: Date.now()
      });
    } else {
      policy.title = title || policy.title;
      policy.content = content || policy.content;
      policy.lastUpdated = Date.now();
      await policy.save();
    }

    res.json({ success: true, message: 'Policy updated successfully', data: policy });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 16. BASIC REPORTS
// ==========================================
exports.getBasicReports = async (req, res, next) => {
  try {
    const bookings = await Booking.find().populate('vehicle').populate('driver').sort({ createdAt: -1 }).limit(10);
    const payments = await Payment.find().sort({ createdAt: -1 }).limit(10);
    const cancellations = await Cancellation.find().sort({ createdAt: -1 }).limit(10);
    const compensations = await Compensation.find().sort({ createdAt: -1 }).limit(10);
    const insurances = await Insurance.find().sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        bookings,
        payments,
        cancellations,
        compensations,
        insurances
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 17. SERVICE CONTROL (BUS / EV-SEWA / CAR TOGGLES)
// ==========================================
exports.getServiceControl = async (req, res, next) => {
  try {
    let serviceControl = await ServiceControl.findOne();
    if (!serviceControl) {
      serviceControl = await ServiceControl.create({
        busService: 'Active',
        evSewaService: 'Active',
        carService: 'Active'
      });
    }
    res.json({ success: true, data: serviceControl });
  } catch (error) {
    next(error);
  }
};

exports.updateServiceControl = async (req, res, next) => {
  try {
    const { busService, evSewaService, carService } = req.body;
    let serviceControl = await ServiceControl.findOne();
    if (!serviceControl) {
      serviceControl = new ServiceControl();
    }

    if (busService) serviceControl.busService = busService;
    if (evSewaService) serviceControl.evSewaService = evSewaService;
    if (carService) serviceControl.carService = carService;

    await serviceControl.save();

    res.json({
      success: true,
      message: 'Service control statuses updated. Inactive services will not accept new bookings.',
      data: serviceControl
    });
  } catch (error) {
    next(error);
  }
};
