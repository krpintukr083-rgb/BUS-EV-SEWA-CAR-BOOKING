const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    bookingId: {
      type: String,
      required: true
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true }
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    bookingAmount: {
      type: Number,
      required: true
    },
    driverPayment: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Successful', 'Failed', 'Refunded'],
      default: 'Successful'
    },
    transactionReference: {
      type: String,
      required: true
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundStatus: {
      type: String,
      enum: ['None', 'Pending', 'Processed'],
      default: 'None'
    },
    refundDate: {
      type: Date,
      default: null
    },
    refundReason: {
      type: String,
      default: ''
    },
    compensationRef: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
