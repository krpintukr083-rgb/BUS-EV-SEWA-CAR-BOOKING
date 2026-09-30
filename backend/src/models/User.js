const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,  // allows null for Sub-Admins without phone
      default: null
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'sub_admin', 'driver', 'customer'],
      default: 'customer'
    },
    // Sub-Admin: predefined type template or 'custom'
    adminType: {
      type: String,
      enum: [
        'driver_management', 'customer_management', 'vehicle_management',
        'booking_management', 'payment_management', 'support_management',
        'notification_management', 'reports_management', 'custom'
      ],
      default: null
    },
    // Granular permissions array — only meaningful when role === 'sub_admin'
    permissions: {
      type: [String],
      default: []
    },
    // Permission version — increment to invalidate old JWT tokens on permission change
    permissionsVersion: {
      type: Number,
      default: 1
    },
    // Admin metadata
    adminMeta: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      lastLoginAt: { type: Date, default: null },
      suspendedAt: { type: Date, default: null },
      suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Blocked', 'Pending Verification', 'Suspended'],
      default: 'Active'
    },
    profilePhoto: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
    },
    pushToken: {
      type: String,
      default: null
    },
    fcmToken: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has a specific permission (Super Admin always returns true)
userSchema.methods.hasPermission = function (permission) {
  if (this.role === 'admin') return true;
  if (this.role !== 'sub_admin') return false;
  return this.permissions.includes(permission);
};

module.exports = mongoose.model('User', userSchema);
