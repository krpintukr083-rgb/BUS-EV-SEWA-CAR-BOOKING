const User = require('../models/User');
const Driver = require('../models/Driver');
const Otp = require('../models/Otp');
const smsService = require('../services/smsService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const mongoose = require('mongoose');

// Phone number normalization helper
const normalizePhone = (inputPhone) => {
  if (!inputPhone) return '';
  const digits = inputPhone.toString().replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};


// Generate JWT token — includes permissionsVersion so stale tokens can be detected
const generateToken = (id, role, permissionsVersion = 1) => {
  return jwt.sign({ id, role, permissionsVersion }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn
  });
};

// @desc    Auth user & get token (Login via Email or Mobile Number)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { identifier, password, role: rawRole } = req.body;
    const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : rawRole;

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
        { phone: `+977${last10}` },
        { phone: `977${last10}` },
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

    // Diagnostic logging
    console.log('--- DIAGNOSTIC LOGIN LOG ---');
    console.log('requested login identifier:', cleanId);
    console.log('requested role:', role);
    console.log('matched user _id:', user._id);
    console.log('matched user email:', user.email);
    console.log('matched user role:', user.role);
    console.log('matched user accountType:', user.accountType);
    console.log('matched user userType:', user.userType);
    const dbInstance = mongoose.connection.db;
    console.log('MongoDB database name:', dbInstance ? dbInstance.databaseName : 'Unknown');
    // Verify Password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please try again.'
      });
    }

    // Ensure Super Admin accounts are ALWAYS role 'admin' and never mutated
    // If user.role is missing (null/undefined), default to 'customer' for legacy records
    if (!user.role) {
      user.role = 'customer';
      await user.save();
    }
    const isAdminAccount = user.email && (
      user.email.toLowerCase() === 'admin@platform.com' ||
      user.email.toLowerCase() === 'admin@transportplatform.com' ||
      user.email.toLowerCase().startsWith('admin@')
    );

    if (isAdminAccount) {
      if (user.role !== 'admin') {
        user.role = 'admin';
        user.status = 'Active';
        await user.save();
      }
    } else if (role && role !== 'customer' && role !== 'sub_admin' && user.role !== role) {
      // Sub-Admin login: accept role='admin' login request for sub_admin accounts too
      if (!(role === 'admin' && user.role === 'sub_admin')) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This account does not have '${role}' access privileges.`
        });
      }
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

    // Track last login for Sub-Admins
    if (user.role === 'sub_admin') {
      user.adminMeta = user.adminMeta || {};
      user.adminMeta.lastLoginAt = new Date();
      await user.save();
    }

    // Generate Token — embed permissionsVersion for Sub-Admins
    const token = generateToken(user._id, user.role, user.permissionsVersion || 1);

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
        adminType: user.adminType || null,
        permissions: user.role === 'sub_admin' ? (user.permissions || []) : undefined,
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

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        adminType: user.adminType || null,
        permissions: user.role === 'sub_admin' ? (user.permissions || []) : undefined,
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
    if (!phone || !phone.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Mobile phone number is required' });
    }

    const rawPhone = phone.toString().trim();
    const last10 = normalizePhone(rawPhone);

    if (!last10 || last10.length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    const phoneKey = last10;
    const now = new Date();

    // Check resend rate limit (60 seconds cooldown)
    const existingOtp = await Otp.findOne({ phone: phoneKey });
    if (existingOtp && existingOtp.resendAfter > now) {
      const waitSeconds = Math.ceil((existingOtp.resendAfter - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
      });
    }

    // Invalidate any active OTPs for this phone number
    await Otp.deleteMany({ phone: phoneKey });

    // Generate random 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP with bcrypt before saving to DB
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpCode, salt);

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity
    const resendAfter = new Date(now.getTime() + 60 * 1000); // 60 seconds cooldown

    await Otp.create({
      phone: phoneKey,
      otp: hashedOtp,
      expiresAt,
      resendAfter,
      attempts: 0
    });

    // Send SMS via AakashSMS API
    const smsMessage = `Your YatraSewanp OTP is ${otpCode}. Valid for 5 minutes.`;
    const smsResult = await smsService.sendSms(last10, smsMessage);

    if (!smsResult.success) {
      // Clean up OTP if SMS dispatch fails so user is not stuck
      await Otp.deleteMany({ phone: phoneKey });
      return res.status(400).json({
        success: false,
        message: smsResult.message || 'Failed to send SMS OTP. Please check the mobile number and try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your mobile number via SMS.',
      data: { phone: rawPhone, otpSent: true }
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
      return res.status(400).json({ success: false, message: 'Phone number and OTP code are required' });
    }

    const rawPhone = phone.toString().trim();
    const cleanOtp = otp.toString().trim();
    const last10 = normalizePhone(rawPhone);

    if (!last10 || last10.length < 10) {
      return res.status(400).json({ success: false, message: 'Invalid mobile phone number' });
    }

    const phoneKey = last10;
    const otpDoc = await Otp.findOne({ phone: phoneKey });
    const now = new Date();

    if (!otpDoc || otpDoc.expiresAt < now) {
      if (otpDoc) {
        await Otp.deleteOne({ _id: otpDoc._id });
      }
      return res.status(400).json({ success: false, message: 'OTP has expired or is invalid. Please request a new OTP.' });
    }

    // Check attempt limit
    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Compare candidate OTP
    const isMatch = await otpDoc.compareOtp(cleanOtp);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    // Delete OTP record immediately upon successful verification (one-time use)
    await Otp.deleteOne({ _id: otpDoc._id });

    // Look up existing user by phone
    const orConditions = [
      { phone: rawPhone },
      { phone: `+977${last10}` },
      { phone: `977${last10}` },
      { phone: `+91${last10}` },
      { phone: `91${last10}` },
      { phone: last10 }
    ];
    if (last10.length >= 7) {
      orConditions.push({ phone: { $regex: new RegExp(last10 + '$') } });
    }

    let user = await User.findOne({ $or: orConditions });

    if (user && user.status === 'Blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked by the administrator.' });
    }

    // Create customer account if user does not exist yet
    if (!user) {
      const generatedEmail = `customer_${last10}@yatrasewanp.com`;
      const defaultPassword = `OTP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      user = await User.create({
        name: `Customer ${last10}`,
        email: generatedEmail,
        phone: `+977${last10}`,
        password: defaultPassword,
        role: 'customer',
        status: 'Active'
      });
    }

    let driverData = null;
    if (user.role === 'driver') {
      driverData = await Driver.findOne({ user: user._id }).populate('assignedVehicle');
    }

    const token = generateToken(user._id, user.role, user.permissionsVersion || 1);

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      token,
      driver: driverData,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        adminType: user.adminType || null,
        permissions: user.role === 'sub_admin' ? (user.permissions || []) : undefined,
        status: user.status,
        profilePhoto: user.profilePhoto,
        driverInfo: driverData
      }
    });
  } catch (error) {
    next(error);
  }
};

