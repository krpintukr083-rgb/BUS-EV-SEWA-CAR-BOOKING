const Notification = require('../models/Notification');

// @desc    Get notifications for authenticated customer
// @route   GET /api/notifications
// @access  Private (Customer)
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipientRole: 'all' },
        { recipientRole: 'customer' },
        { recipientId: req.user._id }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};
