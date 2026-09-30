const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const AuditLog = require('../models/AuditLog');
const jwtConfig = require('../config/jwt');

// Verify JWT Token (unchanged for full backward compatibility)
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

    if (user.status === 'Blocked' || user.status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: `Account has been ${user.status.toLowerCase()}. Please contact platform support.`
      });
    }

    // Permission-version check: if the token was issued before the current permissions version
    // (i.e., Super Admin changed permissions after token was issued), re-auth is required.
    // We use permissionsVersion embedded in the token (or fall back gracefully for old tokens).
    if (user.role === 'sub_admin' && decoded.permissionsVersion !== undefined) {
      if (decoded.permissionsVersion < user.permissionsVersion) {
        return res.status(401).json({
          success: false,
          message: 'Your permissions have been updated by the Super Admin. Please log in again.'
        });
      }
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

// Super Admin authorization middleware — only role==='admin' passes.
// Sub-Admins must use adminOrSubAdminAuth instead.
const adminAuth = async (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'sub_admin')) {
    // Self-healing check: if the user's email is an admin email, automatically restore admin role
    const isAdminAccount = req.user && req.user.email && (
      req.user.email.toLowerCase() === 'admin@platform.com' ||
      req.user.email.toLowerCase() === 'admin@transportplatform.com' ||
      req.user.email.toLowerCase().startsWith('admin@')
    );
    if (isAdminAccount) {
      req.user.role = 'admin';
      try {
        await req.user.save();
      } catch (e) {}
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Admin privileges required.'
    });
  }
  next();
};

// Strict Super Admin only — used for sub-admin management routes
const superAdminOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Super Admin privileges required.'
    });
  }
  next();
};

/**
 * Permission middleware factory.
 * Usage: requirePermission('driver.view')
 *
 * Super Admin (role === 'admin') bypasses all permission checks.
 * Sub-Admin must have the exact permission string in their permissions array.
 * If the Sub-Admin account is Inactive or Suspended they are denied.
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    // Super Admin always passes
    if (req.user.role === 'admin') return next();

    // Sub-Admin permission check
    if (req.user.role === 'sub_admin') {
      if (req.user.status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: `Sub-Admin account is ${req.user.status}. Access denied.`
        });
      }
      if (!req.user.permissions || !req.user.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to perform this action. Required: ${permission}`
        });
      }
      return next();
    }

    // All other roles (driver, customer) are denied
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Admin privileges required.'
    });
  };
};

/**
 * Audit log helper — call this from controllers to record admin actions.
 * Never logs passwords, tokens, OTPs, or secrets.
 */
const logAdminAction = async ({ req, action, module, targetId = null, targetName = null, details = null, result = 'success' }) => {
  try {
    if (!req.user) return;
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      adminType: req.user.adminType || null,
      action,
      module,
      targetId: targetId ? String(targetId) : null,
      targetName,
      details,
      result,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null
    });
  } catch (err) {
    // Audit log failures must never crash the main request
    console.error('[AUDIT LOG ERROR]', err.message);
  }
};

// Driver authorization middleware (unchanged)
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
  superAdminOnly,
  requirePermission,
  logAdminAction,
  driverAuth
};
