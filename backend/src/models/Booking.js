const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true
    },
    vehicleSource: {
      type: String,
      enum: ['OWN', 'THIRD_PARTY'],
      default: 'OWN'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: '' }
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      default: null
    },
    serviceType: {
      type: String,
      enum: ['Bus', 'EV-Sewa', 'Car', 'Truck'],
      required: true
    },
    bookingMode: {
      type: String,
      enum: ['NORMAL', 'INSTANT'],
      default: 'NORMAL'
    },
    pickupLocation: {
      type: String,
      required: true
    },
    dropLocation: {
      type: String,
      required: true
    },
    // Hired Vehicle Details snapshot for audit integrity
    hiredVehicleDetails: {
      hireAmount: { type: Number, default: 0 },
      additionalExpense: { type: Number, default: 0 },
      vendorName: { type: String, default: '' },
      vendorMobile: { type: String, default: '' },
      driverName: { type: String, default: '' },
      driverMobile: { type: String, default: '' },
      driverLicenseNumber: { type: String, default: '' },
      hirePaymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
      },
      loadCapacity: { type: String, default: '' },
      notes: { type: String, default: '' }
    },
    passengerDetails: [
      {
        name: { type: String, required: true },
        age: { type: Number, required: true },
        gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
        seatNumber: { type: String, default: '' }
      }
    ],
    fare: {
      type: Number,
      required: true
    },
    originalFare: {
      type: Number,
      default: 0
    },
    discountPercentage: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    finalFare: {
      type: Number,
      default: 0
    },
    driverPaymentAmount: {
      type: Number,
      default: 0
    },
    paymentMethod: {
      type: String,
      default: 'Online Razorpay'
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Pending Cash', 'Paid', 'Successful', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    cashCollected: {
      type: Boolean,
      default: false
    },
    cashCollectedAt: {
      type: Date,
      default: null
    },
    cashCollectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    bookingStatus: {
      type: String,
      enum: [
        'Pending Admin Confirmation',
        'PENDING_ADMIN_CONFIRMATION',
        'Admin Confirmed',
        'ADMIN_CONFIRMED',
        'Pending',
        'Pending Driver Confirmation',
        'Awaiting Cash Collection',
        'Confirmed',
        'Ongoing',
        'Completed',
        'Cancelled',
        'Rejected'
      ],
      default: 'Pending Admin Confirmation'
    },
    confirmationOtpHash: {
      type: String,
      default: null,
      select: false
    },
    confirmationOtpExpiresAt: {
      type: Date,
      default: null
    },
    confirmationOtpVerifiedAt: {
      type: Date,
      default: null
    },
    confirmationOtpVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerViewOtp: {
      type: String,
      default: null
    },
    driverConfirmationStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Rejected'],
      default: 'Pending'
    },
    driverConfirmed: {
      type: Boolean,
      default: false
    },
    driverConfirmedAt: {
      type: Date,
      default: null
    },
    driverConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    cancellationStatus: {
      type: String,
      enum: ['None', 'Requested', 'Approved', 'Refunded'],
      default: 'None'
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    cancelledBy: {
      type: String,
      default: ''
    },
    // Ride Lifecycle Management (Car / EV-Sewa / Driver Operations)
    rideStatus: {
      type: String,
      enum: ['None', 'Accepted', 'Arrived', 'Started', 'Completed', 'Cancelled'],
      default: 'None'
    },
    rideOtp: {
      type: String,
      default: function () {
        return Math.floor(1000 + Math.random() * 9000).toString();
      }
    },
    otpVerified: {
      type: Boolean,
      default: false
    },
    arrivedAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    travelDate: {
      type: Date,
      default: Date.now
    },
    busSeatNumbers: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
);

// Performance Indexes
bookingSchema.index({ driver: 1, bookingStatus: 1, createdAt: -1 });
bookingSchema.index({ vehicle: 1, bookingStatus: 1 });
// Composite index for date-wise seat availability queries (critical for bus seat occupancy)
bookingSchema.index({ vehicle: 1, travelDate: 1, bookingStatus: 1 });
bookingSchema.index({ vehicleSource: 1 });
bookingSchema.index({ bookingStatus: 1, createdAt: -1 });
bookingSchema.index({ driverConfirmationStatus: 1 });
bookingSchema.index({ 'customer.phone': 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index(
  { driver: 1 },
  {
    unique: true,
    name: 'one_active_instant_booking_per_driver',
    partialFilterExpression: {
      bookingMode: 'INSTANT',
      driver: { $type: 'objectId' },
      bookingStatus: {
        $in: [
          'Pending Admin Confirmation',
          'PENDING_ADMIN_CONFIRMATION',
          'Admin Confirmed',
          'ADMIN_CONFIRMED',
          'Pending',
          'Pending Driver Confirmation',
          'Awaiting Cash Collection',
          'Confirmed',
          'Ongoing'
        ]
      }
    }
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
