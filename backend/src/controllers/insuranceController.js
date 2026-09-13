const mongoose = require('mongoose');
const Insurance = require('../models/Insurance');
const Booking = require('../models/Booking');

const getBookingQuery = (idOrCode) => {
  return mongoose.isValidObjectId(idOrCode)
    ? { $or: [{ bookingId: idOrCode }, { _id: idOrCode }] }
    : { bookingId: idOrCode };
};

// @desc    Get Insurance details for a booking
// @route   GET /api/insurance/:bookingId
// @access  Private (Customer/Admin)
exports.getInsuranceByBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne(getBookingQuery(req.params.bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    let insurance = await Insurance.findOne({ booking: booking._id });

    if (!insurance) {
      // Create active insurance record if not present
      const policyNumber = `INS-TRANS-${Date.now().toString().slice(-6)}`;
      insurance = await Insurance.create({
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        booking: booking._id,
        bookingId: booking.bookingId,
        policyNumber,
        insuranceProvider: 'National Transport General Insurance Co.',
        insuranceStatus: 'Active',
        maxCoverageLimit: 500000,
        activeStatus: 'Active',
        claimStatus: 'None',
        disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.'
      });
    }

    res.json({
      success: true,
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.',
      data: insurance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Insurance policies for current customer
// @route   GET /api/insurance
// @access  Private (Customer)
exports.getCustomerInsurances = async (req, res, next) => {
  try {
    const insurances = await Insurance.find({
      customerPhone: req.user.phone
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: insurances.length,
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.',
      data: insurances
    });
  } catch (error) {
    next(error);
  }
};
