const mongoose = require('mongoose');

const cancellationSchema = new mongoose.Schema(
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
    bookingAmount: {
      type: Number,
      required: true
    },
    cancellationStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
      default: 'Completed'
    },
    cancellationReason: {
      type: String,
      required: true
    },
    refundStatus: {
      type: String,
      enum: ['Pending', 'Processed', 'Not Applicable'],
      default: 'Pending'
    },
    refundAmount: {
      type: Number,
      required: true
    },
    cancellationDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Cancellation', cancellationSchema);
