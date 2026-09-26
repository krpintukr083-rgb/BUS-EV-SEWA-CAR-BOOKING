export const formatBatteryCapacity = capacity => {
  if (typeof capacity === 'number' && Number.isFinite(capacity)) {
    return `${capacity} kWh`;
  }
  if (typeof capacity === 'string' && capacity.trim()) {
    return capacity;
  }
  return 'Not Available';
};
