const apiResponse = {
  success: true,
  count: 5,
  data: [
    { vehicleStatus: 'Active', vehicleNumber: 'DL1' },
    { vehicleStatus: 'Pending', vehicleNumber: 'DL2' }
  ]
};

// adminService.js
const getVehicles = async () => {
  // simulate api.get return Axios response
  const res = { data: apiResponse };
  return res.data;
};

// VehicleApproval.jsx
const testUI = async () => {
  const res = await getVehicles();
  // res is apiResponse
  const vehicles = res.data || [];
  
  const status = 'Pending';
  const visible = vehicles.filter(v => (v.vehicleStatus || 'Pending') === status);
  console.log("Visible Pending vehicles:", visible.length);

  const statusActive = 'Active';
  const visibleActive = vehicles.filter(v => (v.vehicleStatus || 'Pending') === statusActive);
  console.log("Visible Active vehicles:", visibleActive.length);
};

testUI();
