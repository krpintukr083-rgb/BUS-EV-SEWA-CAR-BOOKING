const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true
    },
    customerPhone: {
      type: String,
      required: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    bookingId: {
      type: String,
      required: true
    },
    policyNumber: {
      type: String,
      required: true
    },
    insuranceProvider: {
      type: String,
      default: 'National Transport General Insurance Co.'
    },
    insuranceStatus: {
      type: String,
      enum: ['Active', 'Expired', 'Claimed'],
      default: 'Active'
    },
    maxCoverageLimit: {
      type: Number,
      default: 500000 // Up to ₹5,00,000
    },
    activeStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    claimStatus: {
      type: String,
      enum: ['None', 'Filed', 'Under Review', 'Approved', 'Rejected'],
      default: 'None'
    },
    disclaimer: {
      type: String,
      default: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Insurance', insuranceSchema);
