const crypto = require('crypto');
const { vehicleMatchesBookingRoute } = require('./src/utils/notification');

function mockVerifyRideOtp(driver, booking, reqBody) {
  // Step 2: Route match
  const assignedVehicle = driver.assignedVehicle;
  const isSelectedBusVehicle = false;
  const isAuthorized = vehicleMatchesBookingRoute(assignedVehicle, booking, { requireRouteMatch: !isSelectedBusVehicle });
  
  if (!isAuthorized) {
    return 'FAIL: 403 Forbidden - Route mismatch';
  }

  // Step 4: OTP Check
  const suppliedOtp = reqBody.otp;
  const suppliedHash = crypto.createHash('sha256').update(suppliedOtp).digest('hex');
  const isMatch = (suppliedHash === booking.confirmationOtpHash) || (booking.confirmationOtp && suppliedOtp === String(booking.confirmationOtp).trim());
  
  if (!isMatch) {
    return 'FAIL: 400 Invalid OTP';
  }

  return 'PASS: 200 Success';
}

const mockDriver = {
  _id: 'driver1',
  assignedVehicle: { route: { origin: 'Delhi', destination: 'Jaipur' } }
};

const mockBooking = {
  _id: 'booking1',
  pickupLocation: 'Delhi',
  dropLocation: 'Jaipur',
  confirmationOtp: '123456'
};

const mockWrongRouteDriver = {
  _id: 'driver2',
  assignedVehicle: { route: { origin: 'Mumbai', destination: 'Pune' } }
};

console.log('4. Correct OTP + wrong route:', mockVerifyRideOtp(mockWrongRouteDriver, mockBooking, { otp: '123456' }));
console.log('5. Wrong OTP + correct route:', mockVerifyRideOtp(mockDriver, mockBooking, { otp: '654321' }));
console.log('6. Correct OTP + correct route:', mockVerifyRideOtp(mockDriver, mockBooking, { otp: '123456' }));
