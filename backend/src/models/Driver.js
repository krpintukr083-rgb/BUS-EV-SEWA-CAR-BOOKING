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
      enum: ['Active', 'Inactive', 'Blocked', 'Pending Verification', 'Approved', 'Rejected', 'Suspended'],
      default: 'Active'
    },
    isOnline: {
      type: Boolean,
      default: true
    },
    address: {
      type: String,
      default: ''
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: 'Family' }
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    // Citizenship / National ID Details
    citizenshipNumber: {
      type: String,
      default: ''
    },
    citizenshipDoc: {
      type: String,
      default: ''
    },
    citizenshipDocFront: {
      type: String,
      default: ''
    },
    citizenshipDocBack: {
      type: String,
      default: ''
    },
    citizenshipIssueDate: {
      type: String,
      default: ''
    },
    citizenshipExpiry: {
      type: String,
      default: ''
    },
    citizenshipStatus: {
      type: String,
      enum: ['Pending', 'Pending Verification', 'Approved', 'Rejected'],
      default: 'Pending Verification'
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
    drivingLicenceExpiry: {
      type: String,
      default: '2028-12-31'
    },
    drivingLicenceStatus: {
      type: String,
      enum: ['Pending', 'Pending Verification', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    // RC Details
    rcNumber: {
      type: String,
      default: ''
    },
    vehicleNumber: {
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
    rcExpiry: {
      type: String,
      default: '2029-06-30'
    },
    rcStatus: {
      type: String,
      enum: ['Pending', 'Pending Verification', 'Approved', 'Rejected'],
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
      enum: ['Pending', 'Pending Verification', 'Approved', 'Rejected'],
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
    fitnessExpiry: {
      type: String,
      default: '2027-03-31'
    },
    fitnessStatus: {
      type: String,
      enum: ['Pending', 'Pending Verification', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    // Route Permit Details
    routePermit: {
      description: { type: String, default: '' },
      document: { type: String, default: '' },
      status: {
        type: String,
        enum: ['Not Submitted', 'Pending', 'Pending Verification', 'Approved', 'Rejected'],
        default: 'Not Submitted'
      },
      rejectionReason: { type: String, default: '' }
    },
    routePermitDescription: {
      type: String,
      default: ''
    },
    routePermitDoc: {
      type: String,
      default: ''
    },
    routePermitStatus: {
      type: String,
      enum: ['Not Submitted', 'Pending', 'Pending Verification', 'Approved', 'Rejected'],
      default: 'Not Submitted'
    },
    // Required Driver Documents (General / Background Verification)
    requiredDocumentsStatus: {
      type: String,
      enum: ['Pending', 'Pending Verification', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    // Driver Wallet & Financials (Authoritative Backend State)
    walletBalance: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalBonus: {
      type: Number,
      default: 0
    },
    totalCommission: {
      type: Number,
      default: 0
    },
    totalWithdrawn: {
      type: Number,
      default: 0
    },
    payoutMethods: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      branch: { type: String, default: '' },
      esewaId: { type: String, default: '' },
      khaltiId: { type: String, default: '' }
    },
    // Ratings & Performance
    rating: {
      type: Number,
      default: 4.8
    },
    totalRatingsCount: {
      type: Number,
      default: 12
    },
    // Language Preference
    language: {
      type: String,
      enum: ['en', 'ne', 'hi'],
      default: 'en'
    },
    // EV Specific State (Manually/System Provided - Strictly NO Fake Live Telemetry)
    batteryPercentage: {
      type: Number,
      default: 85
    },
    estimatedRangeKm: {
      type: Number,
      default: 180
    },
    lastChargedAt: {
      type: Date,
      default: null
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
driverSchema.index({ driverStatus: 1, isOnline: 1 });
driverSchema.index({ drivingLicenceStatus: 1, rcStatus: 1, insuranceStatus: 1, fitnessStatus: 1 });

module.exports = mongoose.model('Driver', driverSchema);
