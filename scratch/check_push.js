const https = require('https');

async function checkPush() {
  const token = 'ExponentPushToken[RZ_rPPJ-jI88oV5zfLBq1a]'; // Harsh's real token from earlier verification
  const payload = [{
    to: token,
    title: 'New Bus Booking Request',
    body: 'Delhi → Jaipur booking request. Tap to view.',
    data: { bookingId: 'BK-123456', screen: 'Requests' },
    sound: 'default',
    priority: 'high',
    channelId: 'driver-booking-requests'
  }];

  console.log('Sending payload:', JSON.stringify(payload, null, 2));

  const sendRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const sendResult = await sendRes.json();
  console.log('Push Ticket Response:', JSON.stringify(sendResult, null, 2));

  if (sendResult.data && sendResult.data[0] && sendResult.data[0].id) {
    const ticketId = sendResult.data[0].id;
    console.log('Ticket ID:', ticketId);

    console.log('Waiting 10 seconds for receipt...');
    await new Promise(r => setTimeout(r, 10000));

    const receiptRes = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ ids: [ticketId] })
    });
    
    const receiptResult = await receiptRes.json();
    console.log('Push Receipt Response:', JSON.stringify(receiptResult, null, 2));
  }
}

checkPush();
