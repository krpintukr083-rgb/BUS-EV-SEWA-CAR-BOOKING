const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseType: {
      type: String,
      enum: ['MARKET_VEHICLE_HIRE', 'FUEL', 'MAINTENANCE', 'TOLL_TAX', 'OTHER'],
      default: 'MARKET_VEHICLE_HIRE'
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    vehicleNumber: {
      type: String,
      default: ''
    },
    vehicleType: {
      type: String,
      default: ''
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    tripReference: {
      type: String,
      default: ''
    },
    vendorName: {
      type: String,
      required: true,
      trim: true
    },
    vendorMobile: {
      type: String,
      default: '',
      trim: true
    },
    hireAmount: {
      type: Number,
      required: true,
      min: 0
    },
    additionalExpense: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending'
    },
    paymentDate: {
      type: Date,
      default: null
    },
    paymentReference: {
      type: String,
      default: ''
    },
    hireDate: {
      type: Date,
      default: Date.now
    },
    pickup: {
      type: String,
      default: ''
    },
    destination: {
      type: String,
      default: ''
    },
    loadCapacity: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.pre('save', function (next) {
  this.totalAmount = (this.hireAmount || 0) + (this.additionalExpense || 0);
  next();
});

// Indexes for fast reporting and audits
expenseSchema.index({ expenseType: 1, paymentStatus: 1 });
expenseSchema.index({ vehicle: 1 });
expenseSchema.index({ booking: 1 });
expenseSchema.index({ hireDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
