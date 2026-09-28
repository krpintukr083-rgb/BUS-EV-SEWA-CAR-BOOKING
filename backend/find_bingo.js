const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0');
  await client.connect();
  const db = client.db('transport_booking_db');
  const users = await db.collection('users').find().toArray();
  let found = false;
  for (const user of users) {
    if (user.role !== 'customer') {
      const isAdminAccount = user.email && (user.email.toLowerCase().startsWith('admin@'));
      const isDriverEmail = user.email && user.email.toLowerCase().includes('driver');
      if (!isAdminAccount && !isDriverEmail) {
        console.log('BINGO:', user);
        found = true;
      }
    }
  }
  if (!found) console.log('None found!');
  await client.close();
}
run().catch(console.dir);
