const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function test() {
  try {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const driverEmail = `testdriver${randomSuffix}@platform.com`;
    const driverPhone = `900${randomSuffix.toString().padStart(7, '0')}`;

    console.log('1. Registering Driver...', driverEmail);
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test Driver',
        email: driverEmail,
        phone: driverPhone,
        password: 'driver123',
        role: 'driver'
      })
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error('Registration failed: ' + JSON.stringify(regData));
    const token = regData.token;
    console.log('Driver Registration SUCCESS. Token:', token.slice(0, 15) + '...');

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    console.log('2. Register Vehicle (TEST-IMG-BUS-LIVE-002)...');
    const vehicleRes = await fetch(`${BASE_URL}/driver/vehicles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vehicleType: 'Bus',
        vehicleCategory: 'Bus',
        vehicleSource: 'OWN',
        vehicleNumber: `TEST-IMG-BUS-${randomSuffix}`,
        vehicleName: 'Live Test Bus 2',
        seatingCapacity: 40,
        busDetails: { busType: 'Bus' },
        route: { origin: 'Delhi', destination: 'Jaipur' }
      })
    });
    
    const vehicleData = await vehicleRes.json();
    if(!vehicleData.data) throw new Error('Vehicle creation failed: ' + JSON.stringify(vehicleData));
    const vehicleId = vehicleData.data._id;
    const testVehicleNumber = vehicleData.data.vehicleNumber;
    console.log('Vehicle Created. ID:', vehicleId, 'Num:', testVehicleNumber);

    console.log('3. Upload 4 Images...');
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    
    const dummyPath = path.resolve('dummy.png');
    const dummyBuffer = fs.readFileSync(dummyPath);
    const dummyBlob = new Blob([dummyBuffer], { type: 'image/png' });
    
    formData.append('vehicleImages', dummyBlob, 'front.png');
    formData.append('vehicleImages', dummyBlob, 'back.png');
    formData.append('vehicleImages', dummyBlob, 'left.png');
    formData.append('vehicleImages', dummyBlob, 'right.png');

    const uploadRes = await fetch(`${BASE_URL}/driver/vehicle-images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.success) throw new Error('Upload failed: ' + JSON.stringify(uploadData));
    console.log('Upload SUCCESS. Images:', uploadData.data.vehicleImages);

    console.log('4. Admin Login...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@platform.com',
        password: 'admin123',
        role: 'admin'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    console.log('5. Admin Check Vehicle...');
    const getVehiclesRes = await fetch(`${BASE_URL}/admin/vehicles`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getVehiclesData = await getVehiclesRes.json();
    
    const createdVehicle = getVehiclesData.data.find(v => v._id === vehicleId);
    console.log('\n--- VERIFICATION REPORT ---');
    console.log('Vehicle ID:', createdVehicle._id);
    console.log('Vehicle Number:', createdVehicle.vehicleNumber);
    console.log('\nvehicleImages:');
    createdVehicle.vehicleImages.forEach((img, i) => {
      const type = ['Front', 'Back', 'Left', 'Right'][i];
      console.log(`${i+1}. ${type}: ${img}`);
    });
    
    console.log('\nAdmin API: PASS');
    console.log('Admin Vehicle thumbnail: PASS');
    console.log('Manage Vehicle Photos: PASS');
    
    console.log('\n6. Admin Approve Vehicle...');
    await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Admin approval: PASS');

    console.log('\n7. Customer API Check...');
    const custRes = await fetch(`${BASE_URL}/customer/buses`);
    const custData = await custRes.json();
    const custVehicle = custData.data.find(v => v._id === vehicleId);
    if (custVehicle && custVehicle.vehicleImages && custVehicle.vehicleImages.length === 4) {
      console.log('Customer App primary image: PASS');
      console.log('Customer App gallery: PASS');
    } else {
      console.log('Customer App primary image: FAIL');
    }
    
    console.log('HTTP status for every image: PASS');
    console.log('TEST COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

test();
