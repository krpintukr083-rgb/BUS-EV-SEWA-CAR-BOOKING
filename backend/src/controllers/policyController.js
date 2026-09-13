const Policy = require('../models/Policy');

// @desc    Get all active policies
// @route   GET /api/policies
// @access  Public
exports.getPolicies = async (req, res, next) => {
  try {
    const policies = await Policy.find().sort({ policyType: 1 });
    res.json({
      success: true,
      count: policies.length,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single policy by type / slug
// @route   GET /api/policies/:type
// @access  Public
exports.getPolicyByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const policy = await Policy.findOne({
      $or: [
        { policyType: type },
        { policyType: type.toLowerCase().replace(/-/g, '_') }
      ]
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: `Policy not found for type: ${type}`
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};
