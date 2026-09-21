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
    bannerImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      trim: true
    },
    offerTitle: {
      type: String,
      default: 'Travel Nepal With TravelSewa',
      trim: true
    },
    offerSubtitle: {
      type: String,
      default: 'Book your journey today with verified luxury fleet',
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
