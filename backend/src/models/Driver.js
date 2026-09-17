const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true
    },
    profilePhoto: {
      type: String,
      default: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
    },
    driverPhoto: {
      type: String,
      default: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
    },
    driverStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'Blocked'],
      default: 'Active'
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    // Driving Licence Details
    drivingLicenceNumber: {
      type: String,
      required: true
    },
    drivingLicenceDoc: {
      type: String,
      default: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80'
    },
    drivingLicenceStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    // RC Details
    rcNumber: {
      type: String,
      default: ''
    },
    rcDetails: {
      type: String,
      default: 'Valid Commercial Vehicle Registration'
    },
    rcDoc: {
      type: String,
      default: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80'
    },
    rcStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    // Vehicle Insurance Details
    insurancePolicyNumber: {
      type: String,
      default: ''
    },
    vehicleInsurance: {
      type: String,
      default: 'Comprehensive Commercial Fleet Insurance'
    },
    insuranceDoc: {
      type: String,
      default: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80'
    },
    insuranceExpiryDetails: {
      type: String,
      default: '2026-12-31'
    },
    insuranceStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    // Fitness / Vehicle Check Certificate
    fitnessDetails: {
      type: String,
      default: 'Passed State Transport Safety Check'
    },
    fitnessDoc: {
      type: String,
      default: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
    },
    fitnessStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    // Required Driver Documents (General / Background Verification)
    requiredDocumentsStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure driverPhoto and profilePhoto are kept in sync
driverSchema.pre('save', function (next) {
  if (this.driverPhoto && !this.profilePhoto) {
    this.profilePhoto = this.driverPhoto;
  } else if (this.profilePhoto && !this.driverPhoto) {
    this.driverPhoto = this.profilePhoto;
  } else if (this.isModified('driverPhoto')) {
    this.profilePhoto = this.driverPhoto;
  } else if (this.isModified('profilePhoto')) {
    this.driverPhoto = this.profilePhoto;
  }
  next();
});

// Performance Indexes
driverSchema.index({ driverStatus: 1 });
driverSchema.index({ drivingLicenceStatus: 1, rcStatus: 1, insuranceStatus: 1, fitnessStatus: 1 });

module.exports = mongoose.model('Driver', driverSchema);
