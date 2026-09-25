const getDriverVehicleOwnershipQuery = (driver) => {
  const ownershipConditions = [
    { assignedDriver: driver._id },
    { 'submission.submittedByDriver': driver._id }
  ];
  const assignedVehicleId = driver.assignedVehicle?._id || driver.assignedVehicle;

  if (assignedVehicleId) {
    ownershipConditions.push({ _id: assignedVehicleId });
  }

  return { $or: ownershipConditions };
};

module.exports = getDriverVehicleOwnershipQuery;
