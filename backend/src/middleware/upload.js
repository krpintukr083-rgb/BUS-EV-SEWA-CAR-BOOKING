const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .substring(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  }
});

// File Filter: Accept JPG, JPEG, PNG, PDF documents
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

  if (extname || mimetype) {
    return cb(null, true);
  }
  return cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF documents are allowed.'), false);
};

// Multer Upload Instance with 10MB limit per file
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: fileFilter
});

const UploadedFile = require('../models/UploadedFile');

// Asynchronously persist uploaded files to MongoDB Atlas for durability across restarts
const persistFilesToMongo = (files) => {
  if (!files || !Array.isArray(files) || files.length === 0) return;
  files.forEach(async file => {
    try {
      if (file.path && fs.existsSync(file.path)) {
        const data = fs.readFileSync(file.path);
        await UploadedFile.findOneAndUpdate(
          { filename: file.filename },
          {
            filename: file.filename,
            originalName: file.originalname,
            contentType: file.mimetype || 'image/jpeg',
            data,
            size: file.size
          },
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      console.warn('MongoDB file persistence warning:', e.message);
    }
  });
};

// Error handling wrapper middleware for single upload
const handleSingleUpload = () => {
  const uploadMiddleware = upload.any();
  return (req, res, next) => {
    uploadMiddleware(req, res, err => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds limit of 2MB per image.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file upload.'
        });
      }

      if (req.files && req.files.length > 0) {
        req.file = req.files[0];
        persistFilesToMongo(req.files);
      } else if (req.file) {
        persistFilesToMongo([req.file]);
      }
      next();
    });
  };
};

// Error handling wrapper middleware for multiple uploads (max 5)
const handleMultipleUpload = (maxCount = 5) => {
  const uploadMiddleware = upload.any();
  return (req, res, next) => {
    uploadMiddleware(req, res, err => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'One or more files exceed the 2MB size limit.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file upload.'
        });
      }

      if (req.files && req.files.length > maxCount) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxCount} images can be uploaded at a time.`
        });
      }

      if (req.files && req.files.length > 0) {
        req.file = req.files[0];
        persistFilesToMongo(req.files);
      }
      next();
    });
  };
};

module.exports = {
  upload,
  handleSingleUpload,
  handleMultipleUpload
};
