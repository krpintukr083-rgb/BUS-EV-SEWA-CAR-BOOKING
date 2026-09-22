async function test() {
  const res = await fetch('https://bus-ev-sewa-car-booking.onrender.com/api/vehicles?type=Bus');
  const data = await res.json();
  const buses = data.data;
  console.log('Total Buses:', buses.length);
  
  const eligible = buses.filter(b => b.route?.origin === 'Delhi' && b.route?.destination === 'Jaipur');
  console.log('Eligible Drivers:');
  eligible.forEach((b, i) => {
    console.log(`${i+1}. Name: ${b.assignedDriver?.name} | Vehicle: ${b.vehicleName} | Route: ${b.route?.origin}->${b.route?.destination} | Status: ${b.assignedDriver?.driverStatus} | PushToken: ${b.assignedDriver?.pushToken ? 'PRESENT' : 'ABSENT'} | Eligible: YES`);
  });

  const ineligible = buses.filter(b => b.route?.origin !== 'Delhi' || b.route?.destination !== 'Jaipur');
  console.log('Ineligible Drivers:');
  ineligible.forEach((b, i) => {
    console.log(`${i+1}. Name: ${b.assignedDriver?.name} | Route: ${b.route?.origin}->${b.route?.destination} | Eligible: NO`);
  });
}
test();
