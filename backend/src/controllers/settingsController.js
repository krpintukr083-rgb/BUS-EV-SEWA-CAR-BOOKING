const BusOffer = require('../models/BusOffer');

/**
 * @desc Get canonical Bus Offer & Banner configuration (Public / Customer / Admin read-only)
 * @route GET /api/settings/bus-offer
 * @access Public
 */
exports.getBusOffer = async (req, res, next) => {
  try {
    let offer = await BusOffer.findOne({ service: 'bus' });

    if (!offer) {
      offer = await BusOffer.create({
        service: 'bus',
        offerStatus: 'active',
        discountPercentage: 15,
        bannerImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        offerTitle: 'Travel Nepal With TravelSewa',
        offerSubtitle: 'Book your journey today with verified luxury fleet',
        lastUpdatedBy: 'System Default'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: offer._id,
        service: offer.service,
        offerStatus: offer.offerStatus,
        discountStatus: offer.offerStatus,
        discountPercentage: offer.discountPercentage,
        bannerImage: offer.bannerImage,
        imageUrl: offer.bannerImage,
        offerTitle: offer.offerTitle,
        offerSubtitle: offer.offerSubtitle,
        lastUpdatedBy: offer.lastUpdatedBy,
        updatedAt: offer.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update Bus Banner & Discount configuration (Protected Admin only)
 * @route PUT /api/settings/bus-offer
 * @access Admin / Super Admin
 */
exports.updateBusOffer = async (req, res, next) => {
  try {
    const { offerStatus, discountStatus, discountPercentage, offerTitle, offerSubtitle, imageUrl, bannerImage } = req.body;

    const updateFields = {};

    // 1. Handle Banner Image Upload or URL
    if (req.file) {
      updateFields.bannerImage = `/uploads/${req.file.filename}`;
    } else if (typeof imageUrl === 'string' && imageUrl.trim() !== '' && imageUrl !== '{}' && imageUrl !== '[object Object]') {
      updateFields.bannerImage = imageUrl.trim();
    } else if (typeof bannerImage === 'string' && bannerImage.trim() !== '' && bannerImage !== '{}' && bannerImage !== '[object Object]') {
      updateFields.bannerImage = bannerImage.trim();
    }

    // 2. Validate & Update Discount Percentage if provided
    if (discountPercentage !== undefined && discountPercentage !== null && String(discountPercentage).trim() !== '') {
      const numDiscount = Number(discountPercentage);
      if (!Number.isFinite(numDiscount) || isNaN(numDiscount)) {
        return res.status(400).json({
          success: false,
          message: 'Discount percentage must be a valid numeric value.'
        });
      }

      if (numDiscount < 0 || numDiscount > 100) {
        return res.status(400).json({
          success: false,
          message: 'Discount percentage must be between 0 and 100.'
        });
      }

      updateFields.discountPercentage = Math.round(numDiscount * 100) / 100;
    }

    // 3. Validate & Update Offer / Discount Status
    const targetStatus = offerStatus || discountStatus || req.body.status;
    if (targetStatus !== undefined) {
      const normalizedStatus = String(targetStatus).toLowerCase().trim();
      if (!['active', 'inactive'].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Discount status must be either active or inactive.'
        });
      }
      updateFields.offerStatus = normalizedStatus;
    }

    if (offerTitle !== undefined) {
      updateFields.offerTitle = String(offerTitle).trim() || 'Travel Nepal With TravelSewa';
    }

    if (offerSubtitle !== undefined) {
      updateFields.offerSubtitle = String(offerSubtitle).trim() || 'Book your journey today with verified luxury fleet';
    }

    updateFields.lastUpdatedBy = req.user?.name || req.user?.phone || 'Super Admin';

    const updatedOffer = await BusOffer.findOneAndUpdate(
      { service: 'bus' },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Banner & Bus Discount configuration updated successfully.',
      data: {
        _id: updatedOffer._id,
        service: updatedOffer.service,
        offerStatus: updatedOffer.offerStatus,
        discountStatus: updatedOffer.offerStatus,
        discountPercentage: updatedOffer.discountPercentage,
        bannerImage: updatedOffer.bannerImage,
        imageUrl: updatedOffer.bannerImage,
        offerTitle: updatedOffer.offerTitle,
        offerSubtitle: updatedOffer.offerSubtitle,
        lastUpdatedBy: updatedOffer.lastUpdatedBy,
        updatedAt: updatedOffer.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};
