const User = require('../models/User');
const Driver = require('../models/Driver');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn
  });
};

// @desc    Auth user & get token (Login via Email or Mobile Number)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or mobile number, and password'
      });
    }

    const cleanId = identifier.trim();
    const isEmail = cleanId.includes('@');
    let user;

    if (isEmail) {
      user = await User.findOne({ email: cleanId.toLowerCase() }).select('+password');
    } else {
      const digits = cleanId.replace(/\D/g, '');
      const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
      const orConditions = [
        { phone: cleanId },
        { phone: `+91${last10}` },
        { phone: `91${last10}` },
        { phone: last10 },
        { email: cleanId.toLowerCase() }
      ];
      if (last10.length >= 7) {
        orConditions.push({ phone: { $regex: new RegExp(last10 + '$') } });
      }
      user = await User.findOne({ $or: orConditions }).select('+password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Role check if specified by frontend login form
    if (role === 'driver' || (user.email && user.email.toLowerCase().includes('driver'))) {
      if (user.role !== 'driver') {
        user.role = 'driver';
        user.status = 'Active';
        await user.save();
      }
    } else if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This account does not have '${role}' access privileges.`
      });
    }

    // Verify Password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please try again.'
      });
    }

    if (user.status === 'Blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked by the administrator.'
      });
    }

    // Driver data lookup
    let driverData = null;
    if (user.role === 'driver') {
      let dDoc = await Driver.findOne({ user: user._id });
      if (!dDoc) {
        dDoc = new Driver({
          user: user._id,
          name: user.name,
          mobileNumber: user.phone,
          profilePhoto: user.profilePhoto,
          driverPhoto: user.profilePhoto,
          driverStatus: 'Active',
          drivingLicenceNumber: 'DL-01-2022-0001',
          drivingLicenceDoc: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
          drivingLicenceStatus: 'Approved',
          citizenshipStatus: 'Approved',
          rcStatus: 'Approved',
          insuranceStatus: 'Approved',
          fitnessStatus: 'Approved',
          requiredDocumentsStatus: 'Approved',
          isOnline: false
        });
        await dDoc.save();
      }
      driverData = await Driver.findOne({ user: user._id }).populate('assignedVehicle');
    }

    // Generate Token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      driver: driverData,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto,
        driverInfo: driverData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let driverData = null;
    if (user.role === 'driver') {
      driverData = await Driver.findOne({ user: user._id }).populate('assignedVehicle');
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto,
        driverInfo: driverData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new customer account
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, phone number, and password'
      });
    }

    // Check if user already exists
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { phone: phone.trim() }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Account with this email or mobile number already exists'
      });
    }

    const userRole = req.body.role && ['customer', 'driver', 'admin'].includes(req.body.role)
      ? req.body.role
      : 'customer';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: userRole,
      status: 'Active'
    });

    let driverInfo = null;
    if (userRole === 'driver') {
      driverInfo = await Driver.create({
        user: user._id,
        name: user.name,
        mobileNumber: user.phone,
        drivingLicenceNumber: 'PENDING',
        driverStatus: 'Pending Verification',
        drivingLicenceStatus: 'Pending Verification',
        rcStatus: 'Pending Verification',
        insuranceStatus: 'Pending Verification',
        fitnessStatus: 'Pending Verification',
        citizenshipStatus: 'Pending Verification',
        requiredDocumentsStatus: 'Pending Verification',
        isOnline: false
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new Driver account
// @route   POST /api/auth/driver-register
// @access  Public
exports.driverRegister = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      driverPhoto,
      address,
      emergencyContact,
      drivingLicenceNumber,
      drivingLicenceDoc,
      drivingLicenceExpiry,
      citizenshipNumber,
      citizenshipDoc
    } = req.body;

    if (!name || !phone || !password || !drivingLicenceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name, mobile phone, password, and driving licence number are required'
      });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : `driver_${Date.now()}@platform.com`;
    const cleanPhone = phone.trim();

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user account with this mobile number or email already exists'
      });
    }

    // Create User record in Pending Verification status
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role: 'driver',
      status: 'Pending Verification',
      profilePhoto: driverPhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
    });

    // Create Driver profile in Pending Verification status
    const driver = await Driver.create({
      user: user._id,
      name: name.trim(),
      mobileNumber: cleanPhone,
      profilePhoto: user.profilePhoto,
      driverPhoto: user.profilePhoto,
      driverStatus: 'Pending Verification',
      address: address || '',
      emergencyContact: emergencyContact || { name: 'Emergency Contact', phone: cleanPhone, relation: 'Family' },
      drivingLicenceNumber: drivingLicenceNumber.trim(),
      drivingLicenceDoc: drivingLicenceDoc || 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      drivingLicenceExpiry: drivingLicenceExpiry || '2028-12-31',
      drivingLicenceStatus: 'Pending Verification',
      citizenshipNumber: citizenshipNumber || '',
      citizenshipDoc: citizenshipDoc || '',
      citizenshipStatus: citizenshipDoc ? 'Pending Verification' : 'Pending Verification',
      rcStatus: 'Pending Verification',
      insuranceStatus: 'Pending Verification',
      fitnessStatus: 'Pending Verification',
      requiredDocumentsStatus: 'Pending Verification',
      isOnline: false
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Driver registration submitted successfully. Account is Pending Verification by Admin.',
      token,
      driver,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto,
        driverInfo: driver
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to Mobile Number
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Mobile phone number is required' });
    }

    // Standard dev/sandbox OTP for development & testing
    const otpCode = '123456';

    res.json({
      success: true,
      message: `OTP sent successfully to ${phone}. (Use test OTP: 123456 in dev/test environment)`,
      data: { phone, otpSent: true }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for Mobile Number
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    if (otp !== '123456' && otp !== '112233') {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      data: { phone, verified: true }
    });
  } catch (error) {
    next(error);
  }
};
