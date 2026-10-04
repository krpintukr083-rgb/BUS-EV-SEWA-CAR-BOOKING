const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true
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
