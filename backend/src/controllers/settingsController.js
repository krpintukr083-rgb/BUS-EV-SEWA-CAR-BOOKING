const BusOffer = require('../models/BusOffer');

/**
 * @desc Get canonical Bus Offer configuration (Public / Customer / Admin read-only)
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
        offerTitle: 'Intercity Luxury Bus Travel',
        offerSubtitle: 'AC Sleeper & Seater coaches with live tracking and instant seat selection.',
        lastUpdatedBy: 'System Default'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        service: offer.service,
        offerStatus: offer.offerStatus,
        discountPercentage: offer.discountPercentage,
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
 * @desc Update Bus Offer configuration (Protected Admin only)
 * @route PUT /api/settings/bus-offer
 * @access Admin / Super Admin
 */
exports.updateBusOffer = async (req, res, next) => {
  try {
    const { offerStatus, discountPercentage, offerTitle, offerSubtitle } = req.body;

    // Validate discount percentage
    if (discountPercentage === undefined || discountPercentage === null || String(discountPercentage).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Discount percentage is required.'
      });
    }

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

    const updateFields = {
      discountPercentage: Math.round(numDiscount * 100) / 100 // support up to 2 decimal places if provided, or integer
    };

    // Validate offer status if provided
    if (offerStatus !== undefined) {
      const normalizedStatus = String(offerStatus).toLowerCase().trim();
      if (!['active', 'inactive'].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Offer status must be either active or inactive.'
        });
      }
      updateFields.offerStatus = normalizedStatus;
    }

    if (offerTitle !== undefined) {
      updateFields.offerTitle = String(offerTitle).trim() || 'Intercity Luxury Bus Travel';
    }

    if (offerSubtitle !== undefined) {
      updateFields.offerSubtitle = String(offerSubtitle).trim() || 'AC Sleeper & Seater coaches with live tracking and instant seat selection.';
    }

    updateFields.lastUpdatedBy = req.user?.name || req.user?.phone || 'Super Admin';

    const updatedOffer = await BusOffer.findOneAndUpdate(
      { service: 'bus' },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Bus discount offer updated successfully.',
      data: {
        service: updatedOffer.service,
        offerStatus: updatedOffer.offerStatus,
        discountPercentage: updatedOffer.discountPercentage,
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
