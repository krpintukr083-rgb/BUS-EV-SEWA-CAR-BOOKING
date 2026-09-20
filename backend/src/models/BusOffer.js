const mongoose = require('mongoose');

const busOfferSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      default: 'bus',
      enum: ['bus'],
      unique: true
    },
    offerStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      lowercase: true,
      trim: true
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [0, 'Discount percentage cannot be less than 0'],
      max: [100, 'Discount percentage cannot exceed 100'],
      default: 15
    },
    offerTitle: {
      type: String,
      default: 'Intercity Luxury Bus Travel',
      trim: true
    },
    offerSubtitle: {
      type: String,
      default: 'AC Sleeper & Seater coaches with live tracking and instant seat selection.',
      trim: true
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

module.exports = mongoose.model('BusOffer', busOfferSchema);
