const User = require('../models/User');

// @desc    Get customer profile
// @route   GET /api/customer/profile
// @access  Private (Customer)
exports.getCustomerProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

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
// @route   PUT /api/customer/profile
// @access  Private (Customer)
exports.updateCustomerProfile = async (req, res, next) => {
  try {
    const { name, email, phone, profilePhoto } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phone) user.phone = phone.trim();
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
