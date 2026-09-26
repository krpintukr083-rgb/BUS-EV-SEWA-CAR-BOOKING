const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Cancellation = require('../models/Cancellation');
const Insurance = require('../models/Insurance');
const Notification = require('../models/Notification');
const Support = require('../models/Support');
const Policy = require('../models/Policy');
const ServiceControl = require('../models/ServiceControl');
const User = require('../models/User');
const { notifyEligibleDriversForBooking } = require('../utils/notification');

const getBookingQuery = (idOrCode) => {
  return mongoose.isValidObjectId(idOrCode)
    ? { $or: [{ bookingId: idOrCode }, { _id: idOrCode }] }
    : { bookingId: idOrCode };
};

// 1. Get Service Statuses
exports.getServicesStatus = async (req, res, next) => {
  try {
    let serviceControl = await ServiceControl.findOne();
    if (!serviceControl) {
      serviceControl = await ServiceControl.create({
        busService: 'Active',
        evSewaService: 'Active',
        carService: 'Active'
      });
    }
    res.json({
      success: true,
      data: serviceControl
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Active Buses
exports.getBuses = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const query = { vehicleType: 'Bus', vehicleStatus: 'Active' };

    const buses = await Vehicle.find(query).populate('assignedDriver').sort({ createdAt: -1 });

    let filtered = buses;
    if (from || to) {
      filtered = buses.filter(b => {
        const originMatch = !from || (b.route?.origin && b.route.origin.toLowerCase().includes(from.toLowerCase()));
        const destMatch = !to || (b.route?.destination && b.route.destination.toLowerCase().includes(to.toLowerCase()));
        return originMatch && destMatch;
      });
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Bus Details & Seat Layout
exports.getBusDetails = async (req, res, next) => {
  try {
    const bus = await Vehicle.findOne({ _id: req.params.id, vehicleType: 'Bus', vehicleStatus: 'Active' })
      .populate('assignedDriver');

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found or currently unavailable' });
    }

    // Find active confirmed bookings for this bus to compute booked seats
    const activeBookings = await Booking.find({
      vehicle: bus._id,
      bookingStatus: { $in: ['Confirmed', 'Pending', 'Pending Driver Confirmation', 'Awaiting Cash Collection', 'Ongoing'] }
    });

    const bookedSeats = [];
    activeBookings.forEach(b => {
      if (b.busSeatNumbers && b.busSeatNumbers.length > 0) {
        b.busSeatNumbers.forEach(s => bookedSeats.push(s));
      }
    });

    res.json({
      success: true,
      data: {
        ...bus.toObject(),
        bookedSeats: Array.from(new Set(bookedSeats))
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get Active EV-Sewa Vehicles
exports.getEvSewa = async (req, res, next) => {
  try {
    const evs = await Vehicle.find({ vehicleType: 'EV-Sewa', vehicleStatus: 'Active' })
      .populate('assignedDriver')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: evs.length,
      data: evs
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get EV-Sewa Details
exports.getEvSewaDetails = async (req, res, next) => {
  try {
    const ev = await Vehicle.findOne({ _id: req.params.id, vehicleType: 'EV-Sewa', vehicleStatus: 'Active' })
      .populate('assignedDriver');

    if (!ev) {
      return res.status(404).json({ success: false, message: 'EV-Sewa vehicle not found or currently unavailable' });
    }

    res.json({
      success: true,
      data: ev
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get Active Cars
exports.getCars = async (req, res, next) => {
  try {
    const cars = await Vehicle.find({ vehicleType: 'Car', vehicleStatus: 'Active' })
      .populate('assignedDriver')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cars.length,
      data: cars
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get Car Details
exports.getCarDetails = async (req, res, next) => {
  try {
    const car = await Vehicle.findOne({ _id: req.params.id, vehicleType: 'Car', vehicleStatus: 'Active' })
      .populate('assignedDriver');

    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found or currently unavailable' });
    }

    res.json({
      success: true,
      data: car
    });
  } catch (error) {
    next(error);
  }
};

// 8. Create Customer Booking
exports.createBooking = async (req, res, next) => {
  try {
    const {
      vehicleId,
      serviceType,
      pickupLocation,
      dropLocation,
      passengerDetails,
      selectedSeats,
      fare,
      travelDate
    } = req.body;

    // Check service availability
    const serviceControl = await ServiceControl.findOne();
    if (serviceControl) {
      if (serviceType === 'Bus' && serviceControl.busService !== 'Active') {
        return res.status(400).json({ success: false, message: 'Bus booking service is temporarily inactive' });
      }
      if (serviceType === 'EV-Sewa' && serviceControl.evSewaService !== 'Active') {
        return res.status(400).json({ success: false, message: 'EV-Sewa service is temporarily inactive' });
      }
      if (serviceType === 'Car' && serviceControl.carService !== 'Active') {
        return res.status(400).json({ success: false, message: 'Car booking service is temporarily inactive' });
      }
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, vehicleStatus: 'Active' });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Selected vehicle is no longer available' });
    }

    // Check seat collision if bus
    if (serviceType === 'Bus' && selectedSeats && selectedSeats.length > 0) {
      const activeBookings = await Booking.find({
        vehicle: vehicle._id,
        bookingStatus: { $in: ['Confirmed', 'Pending', 'Pending Driver Confirmation', 'Awaiting Cash Collection', 'Ongoing'] }
      });

      const alreadyBooked = [];
      activeBookings.forEach(b => {
        if (b.busSeatNumbers && b.busSeatNumbers.length > 0) {
          b.busSeatNumbers.forEach(s => alreadyBooked.push(s));
        }
      });

      const conflictingSeats = selectedSeats.filter(s => alreadyBooked.includes(s));
      if (conflictingSeats.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Seat(s) ${conflictingSeats.join(', ')} are already booked. Please choose different seats.`
        });
      }
    }

    const bookingId = `BK-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    const isOfflineCash = req.body.paymentMethod === 'Offline Cash' || req.body.paymentMethod === 'Cash';

    const crypto = require('crypto');
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const confirmationOtpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const confirmationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 Hours

    const booking = await Booking.create({
      bookingId,
      user: req.user?._id,
      customer: {
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email
      },
      driver: serviceType === 'Bus' ? (req.body.driver || req.body.driverId || vehicle.assignedDriver || null) : null,
      vehicle: vehicle._id,
      serviceType,
      pickupLocation,
      dropLocation,
      passengerDetails: passengerDetails || [{ name: req.user.name, age: 28, gender: 'Male' }],
      fare: Number(fare),
      driverPaymentAmount: Math.round(Number(fare) * 0.8),
      paymentMethod: isOfflineCash ? 'Offline Cash' : (req.body.paymentMethod || 'Online Razorpay'),
      paymentStatus: isOfflineCash ? 'Pending Cash' : 'Pending',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash,
      confirmationOtpExpiresAt,
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: travelDate ? new Date(travelDate) : new Date(),
      busSeatNumbers: selectedSeats || []
    });

    console.log(`[NOTIFY] booking created: ${booking.bookingId} (${booking.pickupLocation} → ${booking.dropLocation}) at ${new Date().toISOString()}`);

    // Create customer notification
    Notification.create({
      title: 'Booking Created - Admin Confirmation Pending',
      message: `Your booking ${booking.bookingId} has been created. Please share OTP ${rawOtp} with the admin/operator for confirmation.`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user._id,
      status: 'Unread'
    });

    // Notify all eligible same-route drivers asynchronously
    notifyEligibleDriversForBooking(booking).catch(error => {
      console.error('Failed to notify eligible booking drivers:', error.message || error);
    });

    const bookingObj = booking.toObject();
    bookingObj.confirmationOtp = rawOtp;
    delete bookingObj.confirmationOtpHash;

    res.status(201).json({
      success: true,
      message: 'Booking created. Please provide the OTP to operator/admin for booking confirmation.',
      data: bookingObj
    });
  } catch (error) {
    next(error);
  }
};

// 9. Process Online Payment
exports.processPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const transactionReference = `TXN-IND-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    // Create Payment Record
    const payment = await Payment.create({
      booking: booking._id,
      bookingId: booking.bookingId,
      customer: {
        name: booking.customer.name,
        phone: booking.customer.phone
      },
      driver: booking.driver || null,
      bookingAmount: booking.fare,
      driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
      paymentStatus: 'Paid',
      transactionReference
    });

    // Update Booking Status
    const isBus = booking.serviceType === 'Bus';
    booking.paymentStatus = 'Paid';
    await booking.save();

    // Create Insurance record for passenger
    const policyNumber = `INS-TRANS-${Date.now().toString().slice(-6)}`;
    await Insurance.create({
      customerName: booking.customer.name,
      customerPhone: booking.customer.phone,
      booking: booking._id,
      bookingId: booking.bookingId,
      policyNumber,
      insuranceProvider: 'National Transport General Insurance Co.',
      insuranceStatus: 'Active',
      maxCoverageLimit: 500000,
      activeStatus: 'Active',
      claimStatus: 'None',
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.'
    });

    // Create notification
    await Notification.create({
      title: 'Payment Received',
      message: 'Your payment was successful.',
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user._id,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Payment Successful!',
      data: {
        booking,
        payment,
        transactionId: transactionReference
      }
    });
  } catch (error) {
    next(error);
  }
};

// 10. Get Customer Bookings (Upcoming & Completed)
exports.getMyBookings = async (req, res, next) => {
  try {
    if (req.user.role === 'driver') {
      return res.status(403).json({ success: false, message: 'Customer booking history is not available to drivers' });
    }

    const userQuery = [
      { 'customer.phone': req.user.phone },
      ...(req.user.email ? [{ 'customer.email': req.user.email }] : []),
      ...(req.user._id ? [{ user: req.user._id }] : [])
    ];
    const bookings = await Booking.find({ $or: userQuery })
      .populate('vehicle')
      .populate('driver')
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map(b => {
      const obj = b.toObject();
      obj.confirmationOtp = obj.customerViewOtp;
      delete obj.confirmationOtpHash;
      delete obj.customerViewOtp;
      return obj;
    });

    const upcoming = formattedBookings.filter(b => ['Pending Admin Confirmation', 'PENDING_ADMIN_CONFIRMATION', 'Admin Confirmed', 'ADMIN_CONFIRMED', 'Pending', 'Pending Driver Confirmation', 'Awaiting Cash Collection', 'Confirmed', 'Ongoing'].includes(b.bookingStatus));
    const completed = formattedBookings.filter(b => ['Completed', 'Cancelled', 'Rejected'].includes(b.bookingStatus));

    res.json({
      success: true,
      data: {
        all: formattedBookings,
        upcoming,
        completed
      }
    });
  } catch (error) {
    next(error);
  }
};

// 11. Get Single Booking Details & Ticket
exports.getBookingDetails = async (req, res, next) => {
  try {
    if (req.user.role === 'driver') {
      return res.status(403).json({ success: false, message: 'Customer booking details are not available to drivers' });
    }

    const booking = await Booking.findOne(getBookingQuery(req.params.id))
      .populate('vehicle')
      .populate('driver', '-canViewCustomerPhone');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payment = await Payment.findOne({ booking: booking._id });

    const obj = booking.toObject();
    obj.confirmationOtp = obj.customerViewOtp;
    delete obj.confirmationOtpHash;
    delete obj.customerViewOtp;

    res.json({
      success: true,
      data: {
        ...obj,
        transactionReference: payment ? payment.transactionReference : 'Pending Payment'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 12. Cancel Booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;

    const booking = await Booking.findOne(getBookingQuery(req.params.id));

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (['Cancelled', 'Completed'].includes(booking.bookingStatus)) {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.bookingStatus}` });
    }

    // Calculate refund according to refund policy
    const refundAmount = booking.fare; // 100% standard refund simulation per policy

    booking.bookingStatus = 'Cancelled';
    booking.cancellationStatus = 'Refunded';
    booking.cancellationReason = cancellationReason || 'Customer requested cancellation';
    booking.paymentStatus = 'Refunded';
    await booking.save();

    // Create cancellation record
    const cancellation = await Cancellation.create({
      booking: booking._id,
      bookingId: booking.bookingId,
      customer: {
        name: booking.customer.name,
        phone: booking.customer.phone
      },
      bookingAmount: booking.fare,
      cancellationStatus: 'Completed',
      cancellationReason: cancellationReason || 'Customer requested cancellation via app',
      refundStatus: 'Processed',
      refundAmount
    });

    // Update payment record if exists
    await Payment.findOneAndUpdate(
      { booking: booking._id },
      { refundAmount, refundStatus: 'Processed', refundDate: new Date(), refundReason: booking.cancellationReason }
    );

    // Create Notification
    await Notification.create({
      title: 'Booking Cancelled & Refund Initiated',
      message: `Booking ${booking.bookingId} has been cancelled. Refund of ₹${refundAmount} has been processed.`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user._id,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully. Refund has been processed.',
      data: {
        booking,
        cancellation,
        refundAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// 13. Customer Notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [{ recipientRole: 'all' }, { recipientRole: 'customer' }, { recipientId: req.user._id }]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// 14. Customer Insurance
exports.getInsuranceInfo = async (req, res, next) => {
  try {
    const insurances = await Insurance.find({
      customerPhone: req.user.phone
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.',
      data: insurances
    });
  } catch (error) {
    next(error);
  }
};

// 15. Customer Support Information
exports.getSupportInfo = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        helplineNumber: '+91 1800-123-4567 (Toll Free)',
        email: 'support@transportplatform.com',
        operationalHours: '24x7 Customer Passenger Helpline',
        emergencyNumber: '+91 98110 99999',
        supportGuidelines: [
          {
            title: 'Booking & Seat Reservation Inquiries',
            description: 'Assistance regarding ticket confirmations, seat numbers, and boarding point locations.'
          },
          {
            title: 'Cancellations & Refund Status',
            description: 'Direct queries regarding ticket cancellation refund status and source bank credit timelines.'
          },
          {
            title: 'Transit Safety & Insurance Coverage',
            description: 'Information regarding passenger safety and statutory accident insurance underwritten policy claims.'
          }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// 16. Policies & Legal Terms
exports.getPolicies = async (req, res, next) => {
  try {
    const policies = await Policy.find().sort({ policyType: 1 });
    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};
