const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true
    },
    subtitle: {
      type: String,
      default: '',
      trim: true
    },
    imageUrl: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true
    },
    linkUrl: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      lowercase: true,
      trim: true
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Banner', bannerSchema);
