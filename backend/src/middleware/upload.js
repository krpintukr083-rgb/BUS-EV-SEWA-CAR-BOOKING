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

const profileImageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };

    if (allowedMimeTypes[extension] !== file.mimetype) {
      return cb(new Error('Invalid profile image. Only JPG, JPEG, PNG, and WEBP images are allowed.'), false);
    }
    return cb(null, true);
  }
}).single('profilePhoto');

const hasValidProfileImageSignature = file => {
  const descriptor = fs.openSync(file.path, 'r');
  try {
    const header = Buffer.alloc(12);
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);

    if (file.mimetype === 'image/jpeg') {
      return signature.length >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
    }
    if (file.mimetype === 'image/png') {
      return signature.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (file.mimetype === 'image/webp') {
      return signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 12) === 'WEBP';
    }
    return false;
  } finally {
    fs.closeSync(descriptor);
  }
};

const UploadedFile = require('../models/UploadedFile');

// Asynchronously persist uploaded files to MongoDB Atlas for durability across restarts
const persistFilesToMongo = (files, failOnError = false) => {
  if (!files || !Array.isArray(files) || files.length === 0) return Promise.resolve();
  return Promise.all(files.map(async file => {
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
      if (failOnError) throw e;
    }
  }));
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

const handleProfileImageUpload = (req, res, next) => {
  profileImageUpload(req, res, async error => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile image must be 10MB or smaller.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${error.message}`
      });
    }
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid profile image upload.'
      });
    }

    if (req.file) {
      if (!hasValidProfileImageSignature(req.file)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('Invalid profile image cleanup warning:', cleanupError.message);
        }
        return res.status(400).json({
          success: false,
          message: 'The uploaded file is not a valid JPG, PNG, or WEBP image.'
        });
      }
      try {
        await persistFilesToMongo([req.file], true);
      } catch (persistenceError) {
        console.error('Profile image persistence failed:', persistenceError.message);
        return res.status(500).json({
          success: false,
          message: 'Unable to save profile image. Please try again.'
        });
      }
    }
    return next();
  });
};

module.exports = {
  upload,
  handleSingleUpload,
  handleMultipleUpload,
  handleProfileImageUpload
};
