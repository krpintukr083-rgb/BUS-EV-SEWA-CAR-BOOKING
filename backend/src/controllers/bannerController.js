const Banner = require('../models/Banner');
const BusOffer = require('../models/BusOffer');

const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80';

// Helper to extract clean string image URL
const cleanStringUrl = (val, fallback = DEFAULT_BANNER_IMAGE) => {
  if (typeof val === 'string' && val.trim() !== '' && val.trim() !== '{}' && val.trim() !== '[object Object]') {
    return val.trim();
  }
  return fallback;
};

// Seed initial default banner if Banner collection is completely empty
const seedInitialBannerIfNeeded = async () => {
  const count = await Banner.countDocuments();
  if (count === 0) {
    let busOffer = await BusOffer.findOne({ service: 'bus' });
    const imgUrl = cleanStringUrl(busOffer?.bannerImage);
    await Banner.create({
      title: busOffer?.offerTitle || 'Travel Nepal With TravelSewa',
      subtitle: busOffer?.offerSubtitle || 'Book your journey today with verified luxury fleet',
      imageUrl: imgUrl,
      status: 'active',
      sortOrder: 1
    });
  }
};

// @desc    Get all banners (Admin)
// @route   GET /api/admin/banners
// @access  Private/Admin
exports.getBanners = async (req, res, next) => {
  try {
    await seedInitialBannerIfNeeded();
    const rawBanners = await Banner.find({}).sort({ sortOrder: 1, createdAt: -1 });

    const banners = rawBanners.map(b => {
      const doc = b.toObject();
      doc.imageUrl = cleanStringUrl(doc.imageUrl);
      return doc;
    });

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
// @route   GET /api/banners/active or GET /api/customer/banners
// @access  Public
exports.getActiveBanners = async (req, res, next) => {
  try {
    await seedInitialBannerIfNeeded();
    const rawBanners = await Banner.find({ status: 'active' }).sort({ sortOrder: 1, createdAt: -1 });

    const banners = rawBanners.map(b => {
      const doc = b.toObject();
      doc.imageUrl = cleanStringUrl(doc.imageUrl);
      return doc;
    });

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
    console.log('--- DIAGNOSTIC: createBanner ---');
    console.log('req.file exists?', !!req.file);
    if (req.file) {
      console.log('req.file.originalname:', req.file.originalname);
      console.log('req.file.mimetype:', req.file.mimetype);
      console.log('req.file.size:', req.file.size);
    }
    console.log('req.body:', req.body);

    const { title, subtitle, status, sortOrder, linkUrl } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else {
      imageUrl = cleanStringUrl(req.body.imageUrl || req.body.bannerImage || req.body.image);
    }

    const banner = await Banner.create({
      title: typeof title === 'string' ? title : '',
      subtitle: typeof subtitle === 'string' ? subtitle : '',
      imageUrl,
      linkUrl: typeof linkUrl === 'string' ? linkUrl : '',
      status: status === 'inactive' ? 'inactive' : 'active',
      sortOrder: Number(sortOrder) || 0
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update banner (Admin)
// @route   PUT /api/admin/banners/:id
// @access  Private/Admin
exports.updateBanner = async (req, res, next) => {
  try {
    console.log('--- DIAGNOSTIC: updateBanner ---');
    console.log('req.file exists?', !!req.file);
    if (req.file) {
      console.log('req.file.originalname:', req.file.originalname);
    }
    console.log('req.body:', req.body);

    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const { title, subtitle, status, sortOrder, linkUrl } = req.body;

    if (req.file) {
      banner.imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl || req.body.bannerImage || req.body.image) {
      const candidate = req.body.imageUrl || req.body.bannerImage || req.body.image;
      if (typeof candidate === 'string' && candidate.trim() !== '' && candidate.trim() !== '{}') {
        banner.imageUrl = candidate.trim();
      }
    }

    if (typeof title === 'string') banner.title = title;
    if (typeof subtitle === 'string') banner.subtitle = subtitle;
    if (typeof linkUrl === 'string') banner.linkUrl = linkUrl;
    if (status) banner.status = status;
    if (sortOrder !== undefined) banner.sortOrder = Number(sortOrder);

    await banner.save();

    res.json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle banner active/inactive status (Admin)
// @route   PATCH /api/admin/banners/:id/status
// @access  Private/Admin
exports.toggleBannerStatus = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const newStatus = req.body.status || (banner.status === 'active' ? 'inactive' : 'active');
    banner.status = newStatus;
    await banner.save();

    res.json({
      success: true,
      message: `Banner status updated to ${newStatus}`,
      data: banner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete banner (Admin)
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.json({
      success: true,
      message: 'Banner deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};
