const Support = require('../models/Support');

// @desc    Submit a support request ticket
// @route   POST /api/support
// @access  Private (Customer)
exports.createSupportTicket = async (req, res, next) => {
  try {
    const { supportIssue, bookingId, message } = req.body;

    if (!supportIssue) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the support issue or query topic'
      });
    }

    const ticketId = `TKT-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;

    const ticket = await Support.create({
      ticketId,
      requesterName: req.user.name,
      role: 'customer',
      mobileNumber: req.user.phone,
      bookingId: bookingId || 'N/A',
      supportIssue: supportIssue || 'Customer Assistance Request',
      supportInformation: message || 'Customer submitted request via Android Mobile App',
      status: 'Open'
    });

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully. Our team will review shortly.',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's support tickets and helpline details
// @route   GET /api/support
// @access  Private (Customer)
exports.getCustomerSupport = async (req, res, next) => {
  try {
    const tickets = await Support.find({
      mobileNumber: req.user.phone
    }).sort({ createdAt: -1 });

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      data: {
        helplineNumber: '+91 1800-123-4567 (Toll Free)',
        email: 'support@transportplatform.com',
        operationalHours: '24x7 Customer Passenger Helpline',
        emergencyNumber: '+91 98110 99999',
        supportGuidelines: [
          {
            title: 'Booking & Seat Reservation Inquiries',
            description: 'Assistance regarding ticket confirmations, seat numbers, and boarding point locations.'
          },
          {
            title: 'Cancellations & Refund Status',
            description: 'Direct queries regarding ticket cancellation refund status and source bank credit timelines.'
          },
          {
            title: 'Transit Safety & Insurance Coverage',
            description: 'Information regarding passenger safety and statutory accident insurance underwritten policy claims.'
          }
        ],
        tickets
      }
    });
  } catch (error) {
    next(error);
  }
};
