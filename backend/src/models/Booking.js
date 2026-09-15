const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true
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
    serviceType: {
      type: String,
      enum: ['Bus', 'EV-Sewa', 'Car'],
      required: true
    },
    pickupLocation: {
      type: String,
      required: true
    },
    dropLocation: {
      type: String,
      required: true
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
    driverPaymentAmount: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Successful', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled', 'Rejected'],
      default: 'Pending'
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
bookingSchema.index({ bookingStatus: 1, createdAt: -1 });
bookingSchema.index({ 'customer.phone': 1 });
bookingSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
