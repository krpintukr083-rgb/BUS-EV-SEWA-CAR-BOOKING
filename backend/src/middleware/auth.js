const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const jwtConfig = require('../config/jwt');

// Verify JWT Token
const verifyToken = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User no longer exists.'
      });
    }

    if (user.status === 'Blocked') {
      return res.status(403).json({
        success: false,
        message: 'Account has been blocked. Please contact platform support.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

// Super Admin authorization middleware
const adminAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Super Admin privileges required.'
    });
  }
  next();
};

// Driver authorization middleware
const driverAuth = async (req, res, next) => {
  if (!req.user || req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Driver privileges required.'
    });
  }

  try {
    const driver = await Driver.findOne({ user: req.user._id }).populate('assignedVehicle');
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found.'
      });
    }

    req.driver = driver;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying driver authorization.'
    });
  }
};

module.exports = {
  verifyToken,
  adminAuth,
  driverAuth
};
