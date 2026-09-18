const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 100
    },
    payoutMethod: {
      type: String,
      enum: ['Bank', 'eSewa', 'Khalti'],
      required: true
    },
    payoutDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      branch: { type: String, default: '' },
      esewaId: { type: String, default: '' },
      khaltiId: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Rejected', 'Blocked'],
      default: 'Pending'
    },
    referenceId: {
      type: String,
      default: function () {
        return `WDR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      }
    },
    adminNotes: {
      type: String,
      default: ''
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

withdrawalSchema.index({ driver: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
