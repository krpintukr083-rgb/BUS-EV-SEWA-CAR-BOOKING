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
    paymentMethod: {
      type: String,
      default: 'Online Razorpay'
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Pending Cash', 'Paid', 'Successful', 'Failed', 'Refunded'],
      default: 'Successful'
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
    transactionReference: {
      type: String,
      required: true
    },
    razorpayOrderId: {
      type: String,
      default: ''
    },
    razorpayPaymentId: {
      type: String,
      default: ''
    },
    razorpaySignature: {
      type: String,
      default: ''
    },
    paymentGateway: {
      type: String,
      default: 'Razorpay'
    },
    paymentTimestamp: {
      type: Date,
      default: Date.now
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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

// Performance Indexes
paymentSchema.index({ driver: 1, createdAt: -1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ booking: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
