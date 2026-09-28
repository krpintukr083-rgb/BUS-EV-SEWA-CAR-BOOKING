async function createFreshInstant() {
  const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
  
  console.log('1. Logging in as customer Priya...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'priya.nair@example.com',
      password: 'user123',
      role: 'customer'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Customer logged in. Token acquired.');

  console.log('2. Creating fresh Instant Booking: Delhi -> Jaipur, Offline Cash, serviceType=Any...');
  const bookRes = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      serviceType: 'Any',
      bookingMode: 'INSTANT',
      passengerDetails: [
        { name: 'Live Verification Passenger', age: 28, gender: 'Female' }
      ],
      paymentMethod: 'Offline Cash',
      fare: 0
    })
  });

  const bookData = await bookRes.json();
  console.log('Create booking response status:', bookRes.status);
  console.log('Created booking:', JSON.stringify(bookData, null, 2));

  if (bookData.data) {
    console.log('\n==================================');
    console.log('CUSTOMER_ID:', bookData.data.bookingId);
    console.log('Customer OTP:', bookData.data.confirmationOtp || bookData.data.customerViewOtp);
    console.log('Initial Fare:', bookData.data.fare);
    console.log('Status:', bookData.data.bookingStatus);
    console.log('==================================');
  }
}

createFreshInstant().catch(console.error);
