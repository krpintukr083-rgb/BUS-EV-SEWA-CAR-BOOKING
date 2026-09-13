const mongoose = require('mongoose');

// 3% Customer Service Compensation Schema (Platform Technical Glitch Compensation)
const compensationSchema = new mongoose.Schema(
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
      phone: { type: String, required: true },
      email: { type: String, default: '' }
    },
    bookingAmount: {
      type: Number,
      required: true
    },
    issueReason: {
      type: String,
      required: true,
      default: 'Verified Platform System Technical Glitch During Route Allocation'
    },
    compensationPercentage: {
      type: Number,
      default: 3 // Fixed 3%
    },
    compensationAmount: {
      type: Number,
      required: true // Calculated as 3% of bookingAmount
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    refundStatus: {
      type: String,
      enum: ['Pending', 'Processed'],
      default: 'Pending'
    },
    paymentReference: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: String,
      default: 'Super Admin'
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Compensation', compensationSchema);
