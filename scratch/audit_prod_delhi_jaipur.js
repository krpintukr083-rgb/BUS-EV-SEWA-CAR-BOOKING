const fs = require('fs');

async function checkProductionAvailability() {
  // Admin Login
  const adminLoginRes = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'adminpassword', role: 'admin' })
  });
  let adminLoginData = await adminLoginRes.json();
  if (!adminLoginData.token) {
    const adminLoginRes2 = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
    });
    adminLoginData = await adminLoginRes2.json();
  }
  const adminToken = adminLoginData.token;

  // Customer Login (Priya)
  const custLoginRes = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' })
  });
  const custData = await custLoginRes.json();
  const custToken = custData.token;

  // 1. Fetch all vehicles
  const vehRes = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/vehicles', {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const vehData = await vehRes.json();
  const vehicles = vehData.data || vehData.vehicles || [];

  // 2. Fetch all drivers
  const driverRes = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/admin/drivers', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const driverData = await driverRes.json();
  const drivers = driverData.data || [];

  // 3. Fetch all bookings
  const bookRes = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/admin/bookings', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const bookData = await bookRes.json();
  const bookings = bookData.data || [];

  console.log(`Production DB summary: ${vehicles.length} vehicles, ${drivers.length} drivers, ${bookings.length} bookings.`);

  // Filter Delhi -> Jaipur Bus vehicles
  const delhiJaipurBuses = vehicles.filter(v =>
    v.vehicleType === 'Bus' &&
    v.route?.origin?.toLowerCase().includes('delhi') &&
    v.route?.destination?.toLowerCase().includes('jaipur')
  );

  console.log(`\nFound ${delhiJaipurBuses.length} Bus vehicles for Delhi -> Jaipur:`);

  for (const v of delhiJaipurBuses) {
    const driverId = v.assignedDriver?._id || v.assignedDriver;
    const driverObj = drivers.find(d => d._id === driverId);

    // Active bookings for this driver
    const driverBookings = bookings.filter(b => {
      const bDriverId = b.driver?._id || b.driver;
      return bDriverId === driverId;
    });

    const activeBookingsToday = driverBookings.filter(b => {
      const statusActive = [
        'Pending Admin Confirmation',
        'PENDING_ADMIN_CONFIRMATION',
        'Admin Confirmed',
        'ADMIN_CONFIRMED',
        'Pending',
        'Pending Driver Confirmation',
        'Awaiting Cash Collection',
        'Confirmed',
        'Ongoing'
      ].includes(b.bookingStatus);
      const isToday = b.travelDate && new Date(b.travelDate) >= new Date(new Date().setHours(0,0,0,0));
      const rideActive = ['Accepted', 'Arrived', 'Started'].includes(b.rideStatus);
      return statusActive && (isToday || rideActive);
    });

    console.log({
      vehicleId: v._id,
      name: v.name || v.busName || v.vehicleName,
      registrationNumber: v.registrationNumber,
      vehicleStatus: v.vehicleStatus,
      vehicleSource: v.vehicleSource,
      route: `${v.route?.origin} -> ${v.route?.destination}`,
      assignedDriverId: driverId || 'NONE',
      driverName: driverObj?.name || 'UNKNOWN',
      driverStatus: driverObj?.driverStatus || 'UNKNOWN',
      driverIsOnline: driverObj?.isOnline,
      driverAssignedVehicle: driverObj?.assignedVehicle?._id || driverObj?.assignedVehicle || 'NONE',
      driverMatchesVehicle: (driverObj?.assignedVehicle?._id || driverObj?.assignedVehicle) === v._id,
      totalDriverBookings: driverBookings.length,
      activeBookingsToday: activeBookingsToday.map(b => ({
        id: b._id,
        status: b.bookingStatus,
        travelDate: b.travelDate,
        rideStatus: b.rideStatus
      }))
    });
  }

  // Also check demo drivers
  console.log('\n=== KNOWN DEMO DRIVERS AUDIT ===');
  for (const name of ['Harsh', 'Ayush', 'Pintu']) {
    const demoDriver = drivers.find(d => d.name?.toLowerCase().includes(name.toLowerCase()));
    if (demoDriver) {
      const assignedVehId = demoDriver.assignedVehicle?._id || demoDriver.assignedVehicle;
      const assignedVeh = vehicles.find(v => v._id === assignedVehId);
      console.log({
        name: demoDriver.name,
        driverId: demoDriver._id,
        driverStatus: demoDriver.driverStatus,
        isOnline: demoDriver.isOnline,
        assignedVehicleId: assignedVehId || 'NONE',
        assignedVehicleName: assignedVeh?.name || assignedVeh?.busName || assignedVeh?.vehicleName || 'NONE',
        assignedVehicleType: assignedVeh?.vehicleType || 'NONE',
        assignedVehicleStatus: assignedVeh?.vehicleStatus || 'NONE',
        assignedVehicleRoute: assignedVeh?.route ? `${assignedVeh.route.origin} -> ${assignedVeh.route.destination}` : 'NONE'
      });
    } else {
      console.log(`Driver ${name} NOT FOUND in drivers list`);
    }
  }
}

checkProductionAvailability().catch(err => console.error(err));
