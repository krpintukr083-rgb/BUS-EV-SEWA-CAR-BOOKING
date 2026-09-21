const User = require('../models/User');

// @desc    Get customer profile
// @route   GET /api/customer/profile, GET /api/user/profile
// @access  Private (Customer)
exports.getCustomerProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer profile
// @route   PUT /api/customer/profile, PUT /api/user/profile
// @access  Private (Customer)
exports.updateCustomerProfile = async (req, res, next) => {
  try {
    const { name, email, phone, profilePhoto } = req.body;
    const userId = req.user?._id || req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This email is already in use by another account' });
      }
      user.email = cleanEmail;
    }

    if (phone && phone.trim() !== user.phone) {
      const cleanPhone = phone.trim();
      const existing = await User.findOne({ phone: cleanPhone, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This phone number is already in use by another account' });
      }
      user.phone = cleanPhone;
    }

    if (name) user.name = name.trim();
    if (profilePhoto) user.profilePhoto = profilePhoto;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Customer / User Login ID (Email or Phone)
// @route   PUT /api/customer/account/login-id, PUT /api/user/account/login-id
// @access  Private (Customer / User)
exports.changeUserLoginId = async (req, res, next) => {
  try {
    const { newLoginId, loginType } = req.body;
    if (!newLoginId || !newLoginId.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide new email or mobile phone number' });
    }

    const cleanId = newLoginId.trim();
    const isEmail = loginType === 'email' || cleanId.includes('@');
    const userId = req.user?._id || req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    if (isEmail) {
      const emailLower = cleanId.toLowerCase();
      const existing = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This email is already registered with another account' });
      }
      user.email = emailLower;
    } else {
      const existing = await User.findOne({ phone: cleanId, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This phone number is already registered with another account' });
      }
      user.phone = cleanId;
    }

    await user.save();

    res.json({
      success: true,
      message: `Login ID changed successfully to ${cleanId}`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Customer / User Password
// @route   PUT /api/customer/account/password, PUT /api/user/account/password
// @access  Private (Customer / User)
exports.changeUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }

    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect. Please try again.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};
