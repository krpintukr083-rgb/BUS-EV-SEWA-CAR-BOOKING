const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    recipient: {
      type: String,
      required: true // 'All Drivers', 'All Customers', 'Driver: Rajesh Sharma', etc.
    },
    recipientRole: {
      type: String,
      enum: ['all', 'driver', 'customer', 'admin'],
      default: 'all'
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['Unread', 'Read'],
      default: 'Unread'
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
