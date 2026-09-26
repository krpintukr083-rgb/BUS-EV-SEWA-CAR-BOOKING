const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const jwtConfig = require('../src/config/jwt');

describe('Driver customer phone visibility', () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const phoneNumber = `919${suffix.slice(-7)}`;
  let admin;
  let customerUser;
  let driverUser;
  let otherDriverUser;
  let thirdDriverUser;
  let driver;
  let otherDriver;
  let thirdDriver;
  let vehicle;
  let booking;
  let otherVehicle;
  let thirdVehicle;
  let otherBooking;
  let adminToken;
  let driverToken;
  let otherDriverToken;
  let thirdDriverToken;

  beforeAll(async () => {
    await connectTestDB();

    admin = await User.create({
      name: 'Phone Visibility Admin',
      email: `phone-visibility-admin-${suffix}@test.com`,
      phone: `981${suffix.slice(-7)}`,
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'Active'
    });
    customerUser = await User.create({
      name: 'Phone Visibility Customer',
      email: `phone-visibility-customer-${suffix}@test.com`,
      phone: phoneNumber,
      password: 'CustomerPassword123!',
      role: 'customer',
      status: 'Active'
    });
    driverUser = await User.create({
      name: 'Phone Visibility Driver',
      email: `phone-visibility-driver-${suffix}@test.com`,
      phone: `982${suffix.slice(-7)}`,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });
    driver = await Driver.create({
      user: driverUser._id,
      name: driverUser.name,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-PHONE-${suffix}`,
      driverStatus: 'Active',
      isOnline: true
    });
    otherDriverUser = await User.create({
      name: 'Second Phone Visibility Driver',
      email: `phone-visibility-driver-b-${suffix}@test.com`,
      phone: `983${suffix.slice(-7)}`,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });
    otherDriver = await Driver.create({
      user: otherDriverUser._id,
      name: otherDriverUser.name,
      mobileNumber: otherDriverUser.phone,
      drivingLicenceNumber: `DL-PHONE-B-${suffix}`,
      driverStatus: 'Active',
      isOnline: true
    });
    thirdDriverUser = await User.create({
      name: 'Third Phone Visibility Driver',
      email: `phone-visibility-driver-c-${suffix}@test.com`,
      phone: `984${suffix.slice(-7)}`,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });
    thirdDriver = await Driver.create({
      user: thirdDriverUser._id,
      name: thirdDriverUser.name,
      mobileNumber: thirdDriverUser.phone,
      drivingLicenceNumber: `DL-PHONE-C-${suffix}`,
      driverStatus: 'Active',
      isOnline: true
    });
    vehicle = await Vehicle.create({
      vehicleNumber: `PHONE-${suffix}`,
      vehicleType: 'Bus',
      vehicleCategory: 'Test Bus',
      vehicleModel: 'Visibility Test Model',
      vehicleName: 'Visibility Test Bus',
      ownerName: driver.name,
      ownerMobileNumber: driver.mobileNumber,
      assignedDriver: driver._id,
      vehicleStatus: 'Active',
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });
    driver.assignedVehicle = vehicle._id;
    await driver.save();
    booking = await Booking.create({
      bookingId: `PHONE-VIS-${suffix}`,
      user: customerUser._id,
      customer: { name: 'Phone Visibility Customer', phone: '910000000000' },
      vehicle: vehicle._id,
      serviceType: 'Bus',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      fare: 500,
      bookingStatus: 'Pending Driver Confirmation'
    });
    otherVehicle = await Vehicle.create({
      vehicleNumber: `OTHER-PHONE-${suffix}`,
      vehicleType: 'Bus',
      vehicleCategory: 'Other Test Bus',
      vehicleModel: 'Other Visibility Model',
      vehicleName: 'Other Driver Bus',
      ownerName: otherDriver.name,
      ownerMobileNumber: otherDriver.mobileNumber,
      assignedDriver: otherDriver._id,
      vehicleStatus: 'Active',
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });
    otherDriver.assignedVehicle = otherVehicle._id;
    await otherDriver.save();
    thirdVehicle = await Vehicle.create({
      vehicleNumber: `THIRD-PHONE-${suffix}`,
      vehicleType: 'Bus',
      vehicleCategory: 'Third Test Bus',
      vehicleModel: 'Third Visibility Model',
      vehicleName: 'Third Driver Bus',
      ownerName: thirdDriver.name,
      ownerMobileNumber: thirdDriver.mobileNumber,
      assignedDriver: thirdDriver._id,
      vehicleStatus: 'Active',
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });
    thirdDriver.assignedVehicle = thirdVehicle._id;
    await thirdDriver.save();
    otherBooking = await Booking.create({
      bookingId: `OTHER-PHONE-VIS-${suffix}`,
      customer: { name: 'Other Customer', phone: '919999999999' },
      vehicle: otherVehicle._id,
      serviceType: 'Bus',
      pickupLocation: 'Bengaluru',
      dropLocation: 'Chennai',
      fare: 400,
      bookingStatus: 'Pending Driver Confirmation'
    });

    adminToken = jwt.sign({ id: admin._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    otherDriverToken = jwt.sign({ id: otherDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    thirdDriverToken = jwt.sign({ id: thirdDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (booking) await Booking.findByIdAndDelete(booking._id);
    if (otherBooking) await Booking.findByIdAndDelete(otherBooking._id);
    if (vehicle) await Vehicle.findByIdAndDelete(vehicle._id);
    if (otherVehicle) await Vehicle.findByIdAndDelete(otherVehicle._id);
    if (thirdVehicle) await Vehicle.findByIdAndDelete(thirdVehicle._id);
    if (driver) await Driver.findByIdAndDelete(driver._id);
    if (otherDriver) await Driver.findByIdAndDelete(otherDriver._id);
    if (thirdDriver) await Driver.findByIdAndDelete(thirdDriver._id);
    if (driverUser) await User.findByIdAndDelete(driverUser._id);
    if (otherDriverUser) await User.findByIdAndDelete(otherDriverUser._id);
    if (thirdDriverUser) await User.findByIdAndDelete(thirdDriverUser._id);
    if (customerUser) await User.findByIdAndDelete(customerUser._id);
    if (admin) await User.findByIdAndDelete(admin._id);
    await closeTestDB();
  });

  it('omits customer phone by default and includes it only after an admin enables access', async () => {
    expect(driver.canViewCustomerPhone).toBe(false);

    const hiddenResponse = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(hiddenResponse.status).toBe(200);
    const primaryHiddenRequest = hiddenResponse.body.data.find(item => item.bookingId === booking.bookingId);
    expect(primaryHiddenRequest).toBeDefined();
    expect(primaryHiddenRequest).not.toHaveProperty('customerPhone');
    expect(primaryHiddenRequest.customer).not.toHaveProperty('phone');
    expect(primaryHiddenRequest.user).not.toHaveProperty('phone');

    const otherDriverHidden = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${otherDriverToken}`);
    expect(otherDriverHidden.status).toBe(200);
    const otherDriverPrimaryHidden = otherDriverHidden.body.data.find(item => item.bookingId === booking.bookingId);
    expect(otherDriverPrimaryHidden).toBeDefined();
    expect(otherDriverPrimaryHidden).not.toHaveProperty('customerPhone');

    const thirdDriverHidden = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${thirdDriverToken}`);
    const thirdDriverPrimaryHidden = thirdDriverHidden.body.data.find(item => item.bookingId === booking.bookingId);
    expect(thirdDriverPrimaryHidden).toBeDefined();
    expect(thirdDriverPrimaryHidden).not.toHaveProperty('customerPhone');

    const enabled = await request(app)
      .put(`/api/admin/drivers/${driver._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ canViewCustomerPhone: true });

    expect(enabled.status).toBe(200);
    expect(enabled.body.data.canViewCustomerPhone).toBe(true);

    const visibleResponse = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(visibleResponse.status).toBe(200);
    const primaryVisibleRequest = visibleResponse.body.data.find(item => item.bookingId === booking.bookingId);
    expect(primaryVisibleRequest.customerPhone).toBe(phoneNumber);
    expect(primaryVisibleRequest.customer.phone).toBe(phoneNumber);

    const otherDriverStillHidden = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${otherDriverToken}`);
    const otherDriverPrimaryStillHidden = otherDriverStillHidden.body.data.find(item => item.bookingId === booking.bookingId);
    expect(otherDriverPrimaryStillHidden).toBeDefined();
    expect(otherDriverPrimaryStillHidden).not.toHaveProperty('customerPhone');

    await request(app)
      .put(`/api/admin/drivers/${otherDriver._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ canViewCustomerPhone: true })
      .expect(200);
    const otherDriverEnabled = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${otherDriverToken}`);
    const otherDriverPrimaryEnabled = otherDriverEnabled.body.data.find(item => item.bookingId === booking.bookingId);
    expect(otherDriverPrimaryEnabled).toBeDefined();
    expect(otherDriverPrimaryEnabled.customerPhone).toBe(phoneNumber);

    await request(app)
      .put(`/api/admin/drivers/${otherDriver._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ canViewCustomerPhone: false })
      .expect(200);
    const primaryStillVisibleToFirstDriver = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(primaryStillVisibleToFirstDriver.body.data.find(item => item.bookingId === booking.bookingId).customerPhone)
      .toBe(phoneNumber);

    await request(app)
      .put(`/api/admin/drivers/${thirdDriver._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ canViewCustomerPhone: true })
      .expect(200);
    const thirdDriverEnabled = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${thirdDriverToken}`);
    const thirdDriverPrimaryEnabled = thirdDriverEnabled.body.data.find(item => item.bookingId === booking.bookingId);
    expect(thirdDriverPrimaryEnabled.customerPhone).toBe(phoneNumber);

    const visibleDetails = await request(app)
      .get(`/api/bookings/${booking.bookingId}`)
      .set('Authorization', `Bearer ${driverToken}`);
    expect(visibleDetails.status).toBe(200);
    expect(visibleDetails.body.data.customerPhone).toBe(phoneNumber);
  });

  it('does not allow a driver to change or read the permission through profile APIs', async () => {
    const updateResponse = await request(app)
      .put('/api/driver/profile')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ canViewCustomerPhone: false });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data).not.toHaveProperty('canViewCustomerPhone');

    const profileResponse = await request(app)
      .get('/api/driver/profile')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data).not.toHaveProperty('canViewCustomerPhone');
    expect(await Driver.findById(driver._id).then(saved => saved.canViewCustomerPhone)).toBe(true);

    const forbiddenAdminUpdate = await request(app)
      .put(`/api/admin/drivers/${driver._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ canViewCustomerPhone: false });

    expect(forbiddenAdminUpdate.status).toBe(403);

    const genericHistory = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${driverToken}`);
    const customerHistory = await request(app)
      .get('/api/customer/my-bookings')
      .set('Authorization', `Bearer ${driverToken}`);
    const customerDetails = await request(app)
      .get(`/api/customer/bookings/${booking.bookingId}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(genericHistory.status).toBe(403);
    expect(customerHistory.status).toBe(403);
    expect(customerDetails.status).toBe(403);
  });

  it("prevents a driver from reading another driver's booking details", async () => {
    const response = await request(app)
      .get(`/api/bookings/${otherBooking.bookingId}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(response.status).toBe(403);
  });

  it('omits phone from dashboard and active bookings when permission is disabled', async () => {
    await request(app)
      .put(`/api/admin/drivers/${driver._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ canViewCustomerPhone: false })
      .expect(200);

    const [dashboardResponse, activeBookingsResponse] = await Promise.all([
      request(app).get('/api/driver/dashboard').set('Authorization', `Bearer ${driverToken}`),
      request(app).get('/api/driver/active-bookings').set('Authorization', `Bearer ${driverToken}`)
    ]);

    expect(dashboardResponse.status).toBe(200);
    const dashboardRequest = dashboardResponse.body.data.bookingRequests.find(item => item.bookingId === booking.bookingId);
    expect(dashboardRequest).toBeDefined();
    expect(dashboardRequest).not.toHaveProperty('customerPhone');
    expect(dashboardRequest.customer).not.toHaveProperty('phone');
    expect(activeBookingsResponse.status).toBe(200);
    const activeBooking = activeBookingsResponse.body.data.find(item => item._id === booking._id.toString());
    expect(activeBooking).toBeDefined();
    expect(activeBooking).not.toHaveProperty('customerPhone');
    expect(activeBooking.customer).not.toHaveProperty('phone');

    const historyResponse = await request(app)
      .get('/api/driver/booking-history')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(historyResponse.status).toBe(200);
    const historyBooking = historyResponse.body.data.find(item => String(item.id) === booking._id.toString());
    expect(historyBooking).toBeDefined();
    expect(historyBooking).not.toHaveProperty('customerPhone');

    const bookingDetailsResponse = await request(app)
      .get(`/api/bookings/${booking.bookingId}`)
      .set('Authorization', `Bearer ${driverToken}`);
    expect(bookingDetailsResponse.status).toBe(200);
    expect(bookingDetailsResponse.body.data).not.toHaveProperty('customerPhone');
    expect(bookingDetailsResponse.body.data.customer).not.toHaveProperty('phone');
  });
});
