const BusOffer = require('../models/BusOffer');
const Banner = require('../models/Banner');

// @desc    Get all banners / bus offer discount configuration (Admin)
// @route   GET /api/admin/banners
// @access  Private/Admin
exports.getBanners = async (req, res, next) => {
  try {
    let busOffer = await BusOffer.findOne({ service: 'bus' });
    if (!busOffer) {
      busOffer = await BusOffer.create({
        service: 'bus',
        offerStatus: 'active',
        discountPercentage: 15,
        bannerImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        offerTitle: 'Travel Nepal With TravelSewa',
        offerSubtitle: 'Book your journey today with verified luxury fleet'
      });
    }

    const banners = [
      {
        _id: busOffer._id,
        imageUrl: busOffer.bannerImage,
        bannerImage: busOffer.bannerImage,
        title: busOffer.offerTitle,
        subtitle: busOffer.offerSubtitle,
        status: busOffer.offerStatus,
        discountStatus: busOffer.offerStatus,
        discountPercentage: busOffer.discountPercentage,
        displayOrder: 1,
        createdAt: busOffer.createdAt,
        updatedAt: busOffer.updatedAt
      }
    ];

    res.json({
      success: true,
      count: banners.length,
      data: banners
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active banners for Customer App (Public)
// @route   GET /api/banners/active
// @access  Public
exports.getActiveBanners = async (req, res, next) => {
  try {
    let busOffer = await BusOffer.findOne({ service: 'bus' });
    if (!busOffer) {
      busOffer = await BusOffer.create({
        service: 'bus',
        offerStatus: 'active',
        discountPercentage: 15,
        bannerImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        offerTitle: 'Travel Nepal With TravelSewa',
        offerSubtitle: 'Book your journey today with verified luxury fleet'
      });
    }

    const banners = [];
    if (busOffer.offerStatus === 'active') {
      banners.push({
        _id: busOffer._id,
        imageUrl: busOffer.bannerImage,
        bannerImage: busOffer.bannerImage,
        title: busOffer.offerTitle,
        subtitle: busOffer.offerSubtitle,
        status: busOffer.offerStatus,
        discountPercentage: busOffer.discountPercentage,
        displayOrder: 1,
        createdAt: busOffer.createdAt,
        updatedAt: busOffer.updatedAt
      });
    }

    res.json({
      success: true,
      count: banners.length,
      data: banners
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new banner (Admin)
// @route   POST /api/admin/banners
// @access  Private/Admin
exports.createBanner = async (req, res, next) => {
  try {
    const { updateBusOffer } = require('./settingsController');
    return updateBusOffer(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    Update banner (Admin)
// @route   PUT /api/admin/banners/:id
// @access  Private/Admin
exports.updateBanner = async (req, res, next) => {
  try {
    const { updateBusOffer } = require('./settingsController');
    return updateBusOffer(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete banner (Admin)
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res, next) => {
  try {
    await BusOffer.findOneAndUpdate(
      { service: 'bus' },
      { $set: { offerStatus: 'inactive' } }
    );

    res.json({
      success: true,
      message: 'Banner deactivated and deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
