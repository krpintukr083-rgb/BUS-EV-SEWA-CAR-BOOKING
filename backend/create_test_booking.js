async function test() {
  const regRes = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/auth/register', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ 
      name: 'Test Customer', 
      email: 'testcustomer_' + Date.now() + '@example.com', 
      phone: '+91999' + Math.floor(Math.random()*10000000), 
      password: 'password123', 
      role: 'customer' 
    }) 
  });
  const regData = await regRes.json();
  if(!regData.success) {
    console.log('Reg failed:', regData);
    return;
  }
  const token = regData.token;
  
  const bookRes = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/bookings', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, 
    body: JSON.stringify({ 
      vehicleId: '6ab179bbb6a4ff707b6ebbc2', // Harsh's bus
      serviceType: 'Bus', 
      pickupLocation: 'Delhi', 
      dropLocation: 'Jaipur', 
      passengerDetails: [{ name: 'Test Passenger', age: 30, gender: 'Male' }], 
      selectedSeats: ['3C'], 
      fare: 500, 
      travelDate: '2026-10-10', 
      paymentMethod: 'Cash' 
    }) 
  });
  
  const bookData = await bookRes.json();
  console.log(JSON.stringify(bookData, null, 2));
}
test();
