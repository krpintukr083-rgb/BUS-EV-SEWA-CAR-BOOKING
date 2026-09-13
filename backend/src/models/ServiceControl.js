const mongoose = require('mongoose');

const serviceControlSchema = new mongoose.Schema(
  {
    busService: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    evSewaService: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    carService: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    lastUpdatedBy: {
      type: String,
      default: 'Super Admin'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ServiceControl', serviceControlSchema);
