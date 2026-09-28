const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
async function run() {
  const client = new MongoClient('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0');
  await client.connect();
  const db = client.db('transport_booking_db');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('user123', salt);
  await db.collection('users').updateOne(
    { email: 'priya.nair@example.com' },
    { $set: { role: 'customer', userType: 'customer', accountType: 'customer', password: hash } }
  );
  console.log('Updated Priya Nair');
  await client.close();
}
run().catch(console.dir);
