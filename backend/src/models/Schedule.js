const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  travelDate: { type: Date, required: true },
  departureTime: { type: String, required: true, trim: true },
  arrivalTime: { type: String, default: '' },
  fareRate: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

scheduleSchema.index({ status: 1, travelDate: 1 });
scheduleSchema.index({ driver: 1, status: 1 });
scheduleSchema.index({ vehicle: 1, status: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
