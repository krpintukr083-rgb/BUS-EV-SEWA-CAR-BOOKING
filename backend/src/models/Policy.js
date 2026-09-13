const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
  {
    policyType: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'terms_and_conditions',
        'privacy_policy',
        'customer_terms',
        'driver_terms',
        'cancellation_policy',
        'refund_policy',
        'compensation_policy',
        'accident_insurance_terms',
        'insurance_disclaimer'
      ]
    },
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      default: 'Super Admin'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Policy', policySchema);
