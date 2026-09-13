const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true
    },
    requesterName: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['customer', 'driver'],
      required: true
    },
    mobileNumber: {
      type: String,
      required: true
    },
    bookingId: {
      type: String,
      default: 'N/A'
    },
    supportIssue: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open'
    },
    supportInformation: {
      type: String,
      default: 'Support ticket logged into system.'
    },
    resolutionNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Support', supportSchema);
