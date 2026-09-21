const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalName: {
    type: String
  },
  contentType: {
    type: String,
    default: 'image/jpeg'
  },
  data: {
    type: Buffer,
    required: true
  },
  size: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.UploadedFile || mongoose.model('UploadedFile', uploadedFileSchema);
