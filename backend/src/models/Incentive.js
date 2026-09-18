const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    targetType: {
      type: String,
      enum: ['RidesCount', 'DailyTarget', 'EVSpecific', 'Weekend', 'PeakHour'],
      default: 'RidesCount'
    },
    targetValue: {
      type: Number,
      required: true,
      default: 10
    },
    bonusAmount: {
      type: Number,
      required: true,
      default: 500
    },
    serviceType: {
      type: String,
      enum: ['All', 'Bus', 'EV-Sewa', 'Car'],
      default: 'All'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function () {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
      }
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Expired'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

incentiveSchema.index({ status: 1, targetType: 1 });

module.exports = mongoose.model('Incentive', incentiveSchema);
