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
    // Typed workflow events are additive; legacy booking/admin notifications use GENERAL.
    eventType: {
      type: String,
      enum: [
        'GENERAL',
        'BOOKING_REQUEST',
        'VEHICLE_SUBMITTED', 'VEHICLE_APPROVED', 'VEHICLE_REJECTED',
        'SCHEDULE_SUBMITTED', 'SCHEDULE_APPROVED', 'SCHEDULE_REJECTED'
      ],
      default: 'GENERAL',
      index: true
    },
    entityType: { type: String, enum: ['Vehicle', 'Schedule', 'Booking'], default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
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

notificationSchema.index(
  { recipientId: 1, entityId: 1, eventType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      eventType: 'BOOKING_REQUEST',
      entityId: { $type: 'objectId' },
      recipientId: { $type: 'objectId' }
    }
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
