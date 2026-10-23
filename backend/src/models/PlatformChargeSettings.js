const mongoose = require('mongoose');

const platformChargeSettingsSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: false
    },
    chargeType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      default: 'PERCENTAGE'
    },
    percentageRate: {
      type: Number,
      default: 10,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100']
    },
    fixedAmount: {
      type: Number,
      default: 50,
      min: [0, 'Fixed amount cannot be negative']
    },
    applicableServices: {
      bus: { type: Boolean, default: true },
      evSewa: { type: Boolean, default: true },
      car: { type: Boolean, default: true }
    },
    applicableBookingModes: {
      instant: { type: Boolean, default: true },
      scheduled: { type: Boolean, default: true }
    },
    minCharge: {
      type: Number,
      default: null,
      min: [0, 'Minimum charge cannot be negative']
    },
    maxCharge: {
      type: Number,
      default: null,
      min: [0, 'Maximum charge cannot be negative']
    },
    currency: {
      type: String,
      default: 'NPR'
    },
    version: {
      type: Number,
      default: 1
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lastUpdatedByName: {
      type: String,
      default: 'Super Admin'
    }
  },
  {
    timestamps: true
  }
);

platformChargeSettingsSchema.statics.getEffectiveSettings = async function () {
  let settings = await this.findOne().sort({ createdAt: -1 });
  if (!settings) {
    settings = await this.create({
      isEnabled: false,
      chargeType: 'PERCENTAGE',
      percentageRate: 10,
      fixedAmount: 50,
      applicableServices: { bus: true, evSewa: true, car: true },
      applicableBookingModes: { instant: true, scheduled: true },
      minCharge: null,
      maxCharge: null,
      currency: 'NPR',
      version: 1,
      lastUpdatedByName: 'System Default'
    });
  }
  return settings;
};

module.exports = mongoose.model('PlatformChargeSettings', platformChargeSettingsSchema);
