const PlatformChargeSettings = require('../models/PlatformChargeSettings');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');

/**
 * @desc Get Platform Charge Settings
 * @route GET /api/admin/platform-charge/settings
 * @access Admin (Super Admin or Sub-Admin with report/payment view permission)
 */
exports.getPlatformChargeSettings = async (req, res, next) => {
  try {
    const settings = await PlatformChargeSettings.getEffectiveSettings();
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update Platform Charge Settings (Super Admin Only)
 * @route PUT /api/admin/platform-charge/settings
 * @access Super Admin
 */
exports.updatePlatformChargeSettings = async (req, res, next) => {
  try {
    const {
      isEnabled,
      chargeType,
      percentageRate,
      fixedAmount,
      applicableServices,
      applicableBookingModes,
      minCharge,
      maxCharge,
      currency
    } = req.body;

    // Strict validation
    if (chargeType !== undefined && !['PERCENTAGE', 'FIXED'].includes(chargeType)) {
      return res.status(400).json({
        success: false,
        message: 'chargeType must be either PERCENTAGE or FIXED'
      });
    }

    if (percentageRate !== undefined && percentageRate !== null && percentageRate !== '') {
      const p = Number(percentageRate);
      if (isNaN(p) || p < 0 || p > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage rate must be a valid number between 0 and 100'
        });
      }
    }

    if (fixedAmount !== undefined && fixedAmount !== null && fixedAmount !== '') {
      const f = Number(fixedAmount);
      if (isNaN(f) || f < 0) {
        return res.status(400).json({
          success: false,
          message: 'Fixed amount cannot be negative'
        });
      }
    }

    if (minCharge !== undefined && minCharge !== null && minCharge !== '') {
      const min = Number(minCharge);
      if (isNaN(min) || min < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum charge cannot be negative'
        });
      }
    }

    if (maxCharge !== undefined && maxCharge !== null && maxCharge !== '') {
      const max = Number(maxCharge);
      if (isNaN(max) || max < 0) {
        return res.status(400).json({
          success: false,
          message: 'Maximum charge cannot be negative'
        });
      }
    }

    if (
      minCharge !== undefined && minCharge !== null && minCharge !== '' &&
      maxCharge !== undefined && maxCharge !== null && maxCharge !== ''
    ) {
      if (Number(minCharge) > Number(maxCharge)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum charge cannot be greater than maximum charge'
        });
      }
    }

    let settings = await PlatformChargeSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = new PlatformChargeSettings();
    }

    if (isEnabled !== undefined) settings.isEnabled = Boolean(isEnabled);
    if (chargeType !== undefined) settings.chargeType = chargeType;
    if (percentageRate !== undefined && percentageRate !== null && percentageRate !== '') {
      settings.percentageRate = Math.round(Number(percentageRate) * 100) / 100;
    }
    if (fixedAmount !== undefined && fixedAmount !== null && fixedAmount !== '') {
      settings.fixedAmount = Math.round(Number(fixedAmount) * 100) / 100;
    }

    if (applicableServices && typeof applicableServices === 'object') {
      settings.applicableServices = {
        bus: applicableServices.bus !== undefined ? Boolean(applicableServices.bus) : settings.applicableServices.bus,
        evSewa: applicableServices.evSewa !== undefined ? Boolean(applicableServices.evSewa) : settings.applicableServices.evSewa,
        car: applicableServices.car !== undefined ? Boolean(applicableServices.car) : settings.applicableServices.car
      };
    }

    if (applicableBookingModes && typeof applicableBookingModes === 'object') {
      settings.applicableBookingModes = {
        instant: applicableBookingModes.instant !== undefined ? Boolean(applicableBookingModes.instant) : settings.applicableBookingModes.instant,
        scheduled: applicableBookingModes.scheduled !== undefined ? Boolean(applicableBookingModes.scheduled) : settings.applicableBookingModes.scheduled
      };
    }

    settings.minCharge = (minCharge !== undefined && minCharge !== null && minCharge !== '') ? Number(minCharge) : null;
    settings.maxCharge = (maxCharge !== undefined && maxCharge !== null && maxCharge !== '') ? Number(maxCharge) : null;
    if (currency) settings.currency = String(currency).trim();

    settings.version = (settings.version || 1) + 1;
    settings.lastUpdatedBy = req.user?._id || null;
    settings.lastUpdatedByName = req.user?.name || 'Super Admin';

    await settings.save();

    // Log to audit log
    try {
      if (req.user) {
        await AuditLog.create({
          adminId: req.user._id,
          adminName: req.user.name || 'Super Admin',
          adminRole: req.user.role || 'admin',
          adminType: req.user.adminType || null,
          action: 'UPDATE_PLATFORM_CHARGE_SETTINGS',
          module: 'platform_charge',
          targetId: String(settings._id),
          targetName: `Platform Charge Config v${settings.version}`,
          details: JSON.stringify({
            isEnabled: settings.isEnabled,
            chargeType: settings.chargeType,
            rateOrAmount: settings.chargeType === 'PERCENTAGE' ? settings.percentageRate : settings.fixedAmount,
            version: settings.version
          }),
          result: 'success'
        });
      }
    } catch (auditErr) {
      console.error('AuditLog error in updatePlatformChargeSettings:', auditErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Platform charge settings updated successfully. Applied to subsequent bookings.',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get Admin Platform Charge Report
 * @route GET /api/admin/platform-charge/reports
 * @access Admin
 */
exports.getPlatformChargeReport = async (req, res, next) => {
  try {
    const { startDate, endDate, serviceType, driverId } = req.query;

    const filter = {
      bookingStatus: 'Completed'
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (serviceType && serviceType !== 'ALL') {
      filter.serviceType = new RegExp(`^${serviceType}$`, 'i');
    }

    if (driverId && driverId !== 'ALL') {
      filter.driver = driverId;
    }

    const bookings = await Booking.find(filter)
      .populate('driver', 'name mobileNumber walletBalance')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate totals based strictly on actual snapshots or backward-compatible fallback
    let totalGrossBookingAmount = 0;
    let totalPlatformChargesCollected = 0;
    let totalNetDriverEarnings = 0;

    const serviceBreakdown = {
      Bus: { gross: 0, charges: 0, net: 0, count: 0 },
      'EV-Sewa': { gross: 0, charges: 0, net: 0, count: 0 },
      Car: { gross: 0, charges: 0, net: 0, count: 0 },
      Other: { gross: 0, charges: 0, net: 0, count: 0 }
    };

    const dateBreakdown = {};
    const driverBreakdown = {};

    const detailedBookings = bookings.map(b => {
      const snap = b.platformChargeSnapshot && b.platformChargeSnapshot.isCalculated
        ? b.platformChargeSnapshot
        : null;

      const gross = snap ? snap.grossFare : (b.fare || 0);
      const charge = snap ? snap.platformCharge : Math.max(0, gross - (b.driverPaymentAmount || Math.round(gross * 0.8)));
      const net = snap ? snap.netDriverEarning : (b.driverPaymentAmount || Math.round(gross * 0.8));
      const isSettled = b.paymentStatus === 'Paid';

      totalGrossBookingAmount += gross;
      totalPlatformChargesCollected += charge;
      totalNetDriverEarnings += net;

      // Service breakdown
      const st = b.serviceType === 'Bus' ? 'Bus' : (b.serviceType === 'EV-Sewa' ? 'EV-Sewa' : (b.serviceType === 'Car' ? 'Car' : 'Other'));
      if (serviceBreakdown[st]) {
        serviceBreakdown[st].gross += gross;
        serviceBreakdown[st].charges += charge;
        serviceBreakdown[st].net += net;
        serviceBreakdown[st].count += 1;
      }

      // Date breakdown (YYYY-MM-DD)
      const dKey = new Date(b.createdAt).toISOString().split('T')[0];
      if (!dateBreakdown[dKey]) {
        dateBreakdown[dKey] = { date: dKey, gross: 0, charges: 0, net: 0, count: 0 };
      }
      dateBreakdown[dKey].gross += gross;
      dateBreakdown[dKey].charges += charge;
      dateBreakdown[dKey].net += net;
      dateBreakdown[dKey].count += 1;

      // Driver breakdown
      const drId = b.driver?._id ? String(b.driver._id) : (b.driver ? String(b.driver) : 'unassigned');
      const drName = b.driver?.name || 'Unassigned Driver';
      if (!driverBreakdown[drId]) {
        driverBreakdown[drId] = {
          driverId: drId,
          driverName: drName,
          driverPhone: b.driver?.mobileNumber || '',
          gross: 0,
          charges: 0,
          net: 0,
          count: 0
        };
      }
      driverBreakdown[drId].gross += gross;
      driverBreakdown[drId].charges += charge;
      driverBreakdown[drId].net += net;
      driverBreakdown[drId].count += 1;

      return {
        bookingId: b.bookingId,
        serviceType: b.serviceType,
        bookingMode: b.bookingMode,
        createdAt: b.createdAt,
        completedAt: b.completedAt || b.updatedAt,
        customerName: b.customer?.name || 'N/A',
        driverName: drName,
        driverId: drId,
        grossFare: gross,
        platformCharge: charge,
        netDriverEarning: net,
        chargeType: snap ? snap.chargeType : 'HISTORICAL',
        chargeRateOrAmount: snap ? snap.chargeRateOrAmount : 20,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        isSettled,
        settingsVersion: snap ? snap.platformChargeSettingsVersion : 1
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalGrossBookingAmount: Math.round(totalGrossBookingAmount * 100) / 100,
          totalPlatformChargesCollected: Math.round(totalPlatformChargesCollected * 100) / 100,
          totalNetDriverEarnings: Math.round(totalNetDriverEarnings * 100) / 100,
          totalCompletedBookings: bookings.length
        },
        serviceBreakdown,
        dateBreakdown: Object.values(dateBreakdown).sort((a, b) => b.date.localeCompare(a.date)),
        driverBreakdown: Object.values(driverBreakdown).sort((a, b) => b.gross - a.gross),
        bookings: detailedBookings
      }
    });
  } catch (error) {
    next(error);
  }
};
