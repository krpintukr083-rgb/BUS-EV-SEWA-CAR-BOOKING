/**
 * Utility to calculate platform charges on driver earnings strictly according
 * to active Admin-configured rules.
 */

function calculatePlatformCharge(fare, serviceType, bookingMode, settings) {
  const grossFare = Math.max(0, Number(fare) || 0);

  // Default snapshot when charge is disabled or not applicable
  const defaultSnapshot = {
    grossFare,
    platformCharge: 0,
    chargeType: settings?.chargeType || 'PERCENTAGE',
    chargeRateOrAmount: 0,
    netDriverEarning: grossFare,
    currency: settings?.currency || 'NPR',
    platformChargeSettingsVersion: settings?.version || 1,
    calculatedAt: new Date()
  };

  if (!settings || !settings.isEnabled) {
    return {
      isApplicable: false,
      reason: 'Platform charges are currently disabled by Admin',
      ...defaultSnapshot
    };
  }

  // Normalize serviceType: 'Bus', 'EV-Sewa', 'Car', etc.
  const normService = String(serviceType || '').toLowerCase();
  let serviceAllowed = false;
  if (normService.includes('bus') && settings.applicableServices?.bus) {
    serviceAllowed = true;
  } else if ((normService.includes('ev') || normService.includes('sewa')) && settings.applicableServices?.evSewa) {
    serviceAllowed = true;
  } else if ((normService.includes('car') || normService.includes('cab') || normService.includes('sedan') || normService.includes('suv')) && settings.applicableServices?.car) {
    serviceAllowed = true;
  }

  if (!serviceAllowed) {
    return {
      isApplicable: false,
      reason: `Platform charges not enabled for service type: ${serviceType}`,
      ...defaultSnapshot
    };
  }

  // Normalize bookingMode: 'INSTANT' vs 'SCHEDULE' / 'NORMAL'
  const normMode = String(bookingMode || '').toUpperCase();
  const isInstant = normMode === 'INSTANT';
  const isScheduled = normMode === 'SCHEDULE' || normMode === 'NORMAL';

  let modeAllowed = false;
  if (isInstant && settings.applicableBookingModes?.instant) {
    modeAllowed = true;
  } else if (isScheduled && settings.applicableBookingModes?.scheduled) {
    modeAllowed = true;
  }

  if (!modeAllowed) {
    return {
      isApplicable: false,
      reason: `Platform charges not enabled for booking mode: ${bookingMode}`,
      ...defaultSnapshot
    };
  }

  // Calculate platform charge according to configured type
  let computedCharge = 0;
  let chargeRateOrAmount = 0;

  if (settings.chargeType === 'FIXED') {
    chargeRateOrAmount = Math.max(0, Number(settings.fixedAmount) || 0);
    computedCharge = chargeRateOrAmount;
  } else {
    // PERCENTAGE mode
    chargeRateOrAmount = Math.min(100, Math.max(0, Number(settings.percentageRate) || 0));
    computedCharge = (grossFare * chargeRateOrAmount) / 100;
  }

  // Apply optional min / max limits
  if (settings.minCharge !== null && settings.minCharge !== undefined && settings.minCharge >= 0) {
    if (computedCharge < Number(settings.minCharge)) {
      computedCharge = Number(settings.minCharge);
    }
  }

  if (settings.maxCharge !== null && settings.maxCharge !== undefined && settings.maxCharge >= 0) {
    if (computedCharge > Number(settings.maxCharge)) {
      computedCharge = Number(settings.maxCharge);
    }
  }

  // Ensure platform charge never exceeds gross fare and cannot be negative
  computedCharge = Math.min(grossFare, Math.max(0, computedCharge));
  // Round to nearest integer or 2 decimal places (standardized to 2 decimal places, rounded)
  computedCharge = Math.round(computedCharge * 100) / 100;

  const netDriverEarning = Math.round((grossFare - computedCharge) * 100) / 100;

  return {
    isApplicable: true,
    grossFare,
    platformCharge: computedCharge,
    chargeType: settings.chargeType,
    chargeRateOrAmount,
    netDriverEarning,
    currency: settings.currency || 'NPR',
    platformChargeSettingsVersion: settings.version || 1,
    calculatedAt: new Date()
  };
}

module.exports = {
  calculatePlatformCharge
};
