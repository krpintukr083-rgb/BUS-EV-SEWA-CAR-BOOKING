/**
 * Sub-Admin Management Controller
 * ALL endpoints in this controller require Super Admin role.
 * Sub-Admins CANNOT access, create, or modify other Sub-Admins.
 */
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const { logAdminAction } = require('../middleware/auth');

// ======================================================
// PERMISSION TEMPLATES
// ======================================================
const PERMISSION_TEMPLATES = {
  driver_management: [
    'driver.view', 'driver.create', 'driver.edit', 'driver.approve',
    'driver.reject', 'driver.suspend', 'driver.activate', 'driver.kyc',
    'vehicle.view'
  ],
  customer_management: [
    'customer.view', 'customer.edit', 'customer.block',
    'customer.deactivate', 'customer.delete'
  ],
  vehicle_management: [
    'vehicle.view', 'vehicle.create', 'vehicle.edit', 'vehicle.approve',
    'vehicle.reject', 'vehicle.activate', 'vehicle.assign_driver',
    'driver.view'
  ],
  booking_management: [
    'booking.view', 'booking.edit', 'booking.cancel',
    'booking.status', 'booking.reports'
  ],
  payment_management: [
    'payment.view', 'payment.verify', 'payment.refund',
    'payment.reports', 'payment.export', 'withdrawal.view',
    'withdrawal.approve', 'withdrawal.reject', 'cancellation.view'
  ],
  support_management: [
    'support.view', 'support.edit', 'support.delete',
    'booking.view', 'customer.view', 'driver.view'
  ],
  notification_management: [
    'notification.view', 'notification.send'
  ],
  reports_management: [
    'report.view', 'report.export',
    'booking.view', 'customer.view', 'driver.view', 'payment.view'
  ]
};

// All valid permissions in the system
const ALL_PERMISSIONS = [
  'driver.view', 'driver.create', 'driver.edit', 'driver.approve',
  'driver.reject', 'driver.suspend', 'driver.activate', 'driver.kyc',
  'customer.view', 'customer.edit', 'customer.block', 'customer.deactivate', 'customer.delete',
  'vehicle.view', 'vehicle.create', 'vehicle.edit', 'vehicle.approve',
  'vehicle.reject', 'vehicle.activate', 'vehicle.assign_driver',
  'booking.view', 'booking.edit', 'booking.cancel', 'booking.status', 'booking.reports',
  'payment.view', 'payment.verify', 'payment.refund', 'payment.reports', 'payment.export',
  'withdrawal.view', 'withdrawal.approve', 'withdrawal.reject',
  'cancellation.view', 'cancellation.refund',
  'notification.view', 'notification.send',
  'support.view', 'support.edit', 'support.delete',
  'report.view', 'report.export',
  'admin.view', 'admin.create', 'admin.edit', 'admin.deactivate', 'admin.permissions'
];

// ======================================================
// GET /api/admin/subadmins
// ======================================================
exports.getSubAdmins = async (req, res, next) => {
  try {
    const subAdmins = await User.find({ role: 'sub_admin' })
      .select('-password')
      .populate('adminMeta.createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: subAdmins.length,
      data: subAdmins
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// GET /api/admin/subadmins/:id
// ======================================================
exports.getSubAdminById = async (req, res, next) => {
  try {
    const subAdmin = await User.findOne({ _id: req.params.id, role: 'sub_admin' })
      .select('-password')
      .populate('adminMeta.createdBy', 'name email');

    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found' });
    }

    return res.json({ success: true, data: subAdmin });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// POST /api/admin/subadmins
// ======================================================
exports.createSubAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password, adminType, permissions: customPermissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and password are required'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Determine permissions: use template if adminType provided, else custom list
    let resolvedPermissions = [];
    if (adminType && adminType !== 'custom' && PERMISSION_TEMPLATES[adminType]) {
      resolvedPermissions = [...PERMISSION_TEMPLATES[adminType]];
    } else if (Array.isArray(customPermissions)) {
      // Validate — only allow known permissions to prevent privilege escalation
      resolvedPermissions = customPermissions.filter(p => ALL_PERMISSIONS.includes(p));
    }

    const subAdmin = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      password,
      role: 'sub_admin',
      adminType: adminType || 'custom',
      permissions: resolvedPermissions,
      permissionsVersion: 1,
      status: 'Active',
      adminMeta: {
        createdBy: req.user._id
      }
    });

    await logAdminAction({
      req,
      action: 'CREATE_SUB_ADMIN',
      module: 'sub_admin',
      targetId: subAdmin._id,
      targetName: `${subAdmin.name} (${subAdmin.email})`,
      details: `adminType: ${subAdmin.adminType}, permissions: ${resolvedPermissions.join(', ')}`
    });

    const result = subAdmin.toObject();
    delete result.password;

    return res.status(201).json({
      success: true,
      message: 'Sub-Admin created successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// PATCH /api/admin/subadmins/:id
// Edit basic profile fields (name, email, phone)
// ======================================================
exports.updateSubAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const subAdmin = await User.findOne({ _id: req.params.id, role: 'sub_admin' });
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found' });
    }

    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      }
      subAdmin.password = password;
      subAdmin.permissionsVersion = (subAdmin.permissionsVersion || 1) + 1;
    }

    if (name) subAdmin.name = name.trim();
    if (email) subAdmin.email = email.toLowerCase().trim();
    if (phone !== undefined) subAdmin.phone = phone?.trim() || null;

    await subAdmin.save();

    await logAdminAction({
      req,
      action: 'EDIT_SUB_ADMIN',
      module: 'sub_admin',
      targetId: subAdmin._id,
      targetName: `${subAdmin.name} (${subAdmin.email})`
    });

    const result = subAdmin.toObject();
    delete result.password;
    return res.json({ success: true, message: 'Sub-Admin updated', data: result });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// PATCH /api/admin/subadmins/:id/permissions
// Only Super Admin can call this.
// ======================================================
exports.updateSubAdminPermissions = async (req, res, next) => {
  try {
    const { permissions, adminType } = req.body;

    const subAdmin = await User.findOne({ _id: req.params.id, role: 'sub_admin' });
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found' });
    }

    let resolvedPermissions = [];
    if (adminType && adminType !== 'custom' && PERMISSION_TEMPLATES[adminType]) {
      resolvedPermissions = [...PERMISSION_TEMPLATES[adminType]];
    } else if (Array.isArray(permissions)) {
      resolvedPermissions = permissions.filter(p => ALL_PERMISSIONS.includes(p));
    }

    subAdmin.permissions = resolvedPermissions;
    if (adminType) subAdmin.adminType = adminType;
    // Increment permissionsVersion to invalidate current JWT tokens
    subAdmin.permissionsVersion = (subAdmin.permissionsVersion || 1) + 1;
    await subAdmin.save();

    await logAdminAction({
      req,
      action: 'UPDATE_SUB_ADMIN_PERMISSIONS',
      module: 'sub_admin',
      targetId: subAdmin._id,
      targetName: `${subAdmin.name} (${subAdmin.email})`,
      details: `New permissions: ${resolvedPermissions.join(', ')}`
    });

    const result = subAdmin.toObject();
    delete result.password;
    return res.json({
      success: true,
      message: 'Permissions updated. The Sub-Admin must log in again to receive the new permissions.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// PATCH /api/admin/subadmins/:id/status
// Activate / Deactivate / Suspend
// ======================================================
exports.updateSubAdminStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Active', 'Inactive', 'Suspended'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const subAdmin = await User.findOne({ _id: req.params.id, role: 'sub_admin' });
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found' });
    }

    subAdmin.status = status;
    if (status === 'Suspended') {
      subAdmin.adminMeta = subAdmin.adminMeta || {};
      subAdmin.adminMeta.suspendedAt = new Date();
      subAdmin.adminMeta.suspendedBy = req.user._id;
      // Increment version to force re-login (which will then be blocked by status check)
      subAdmin.permissionsVersion = (subAdmin.permissionsVersion || 1) + 1;
    }
    await subAdmin.save();

    await logAdminAction({
      req,
      action: `SUB_ADMIN_STATUS_${status.toUpperCase()}`,
      module: 'sub_admin',
      targetId: subAdmin._id,
      targetName: `${subAdmin.name} (${subAdmin.email})`,
      details: `Status changed to ${status}`
    });

    const result = subAdmin.toObject();
    delete result.password;
    return res.json({
      success: true,
      message: `Sub-Admin ${status.toLowerCase()} successfully`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// DELETE /api/admin/subadmins/:id
// ======================================================
exports.deleteSubAdmin = async (req, res, next) => {
  try {
    const subAdmin = await User.findOne({ _id: req.params.id, role: 'sub_admin' });
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found' });
    }

    const name = subAdmin.name;
    const email = subAdmin.email;
    await User.deleteOne({ _id: subAdmin._id });

    await logAdminAction({
      req,
      action: 'DELETE_SUB_ADMIN',
      module: 'sub_admin',
      targetId: req.params.id,
      targetName: `${name} (${email})`
    });

    return res.json({ success: true, message: `Sub-Admin ${name} deleted` });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// PATCH /api/admin/subadmins/:id/reset-password
// ======================================================
exports.resetSubAdminPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const subAdmin = await User.findOne({ _id: req.params.id, role: 'sub_admin' }).select('+password');
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found' });
    }

    subAdmin.password = newPassword; // Will be hashed by pre-save hook
    subAdmin.permissionsVersion = (subAdmin.permissionsVersion || 1) + 1; // Force re-login
    await subAdmin.save();

    await logAdminAction({
      req,
      action: 'RESET_SUB_ADMIN_PASSWORD',
      module: 'sub_admin',
      targetId: subAdmin._id,
      targetName: `${subAdmin.name} (${subAdmin.email})`
      // NEVER log the actual password
    });

    return res.json({ success: true, message: 'Password reset. Sub-Admin must log in again.' });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// GET /api/admin/subadmins/permission-templates
// ======================================================
exports.getPermissionTemplates = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      data: {
        templates: PERMISSION_TEMPLATES,
        allPermissions: ALL_PERMISSIONS
      }
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// GET /api/admin/audit-logs
// ======================================================
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { adminId, module: mod, limit = 100, page = 1 } = req.query;
    const query = {};
    if (adminId) query.adminId = adminId;
    if (mod) query.module = mod;

    const skip = (Number(page) - 1) * Number(limit);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('adminId', 'name email role adminType');

    const total = await AuditLog.countDocuments(query);

    return res.json({ success: true, total, data: logs });
  } catch (err) {
    next(err);
  }
};

module.exports = exports;
