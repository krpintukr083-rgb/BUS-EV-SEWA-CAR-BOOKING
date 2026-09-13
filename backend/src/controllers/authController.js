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

    // Find user by email OR mobile phone
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase().trim() }, { phone: identifier.trim() }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Role check if specified by frontend login form
    if (role && user.role !== role) {
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

    // Generate Token
    const token = generateToken(user._id, user.role);

    // If driver, attach driver document data
    let driverData = null;
    if (user.role === 'driver') {
      driverData = await Driver.findOne({ user: user._id }).populate('assignedVehicle');
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
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

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: 'customer',
      status: 'Active'
    });

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
