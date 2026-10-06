const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true
    },
    purpose: {
      type: String,
      enum: [
        'CUSTOMER_LOGIN', 
        'DRIVER_LOGIN', 
        'BOOKING_CONFIRMATION', 
        'RIDE_VERIFICATION',
        'CUSTOMER_SIGNUP',
        'CUSTOMER_PASSWORD_RESET',
        'CUSTOMER_PASSWORD_RESET_VERIFIED',
        'DRIVER_SIGNUP',
        'DRIVER_PASSWORD_RESET',
        'DRIVER_PASSWORD_RESET_VERIFIED'
      ],
      default: 'CUSTOMER_LOGIN'
    },
    otp: {
      type: String,
      required: true
    },
    resendAfter: {
      type: Date,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically removes expired OTP records from MongoDB
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Helper method to compare candidate OTP code against stored hash or string
otpSchema.methods.compareOtp = async function (candidateOtp) {
  if (!this.otp || !candidateOtp) return false;
  const cleanCandidate = candidateOtp.toString().trim();
  if (this.otp.startsWith('$2a$') || this.otp.startsWith('$2b$')) {
    return await bcrypt.compare(cleanCandidate, this.otp);
  }
  return this.otp === cleanCandidate;
};

module.exports = mongoose.model('Otp', otpSchema);
