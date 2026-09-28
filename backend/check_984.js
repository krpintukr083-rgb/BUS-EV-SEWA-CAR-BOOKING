const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0');
  await client.connect();
  const db = client.db('transport_booking_db');
  const users = await db.collection('users').find({ $or: [{phone: { $regex: '9844556677' }}, {email: { $regex: '9844556677' }}] }).toArray();
  console.log(users);
  await client.close();
}
run().catch(console.dir);
