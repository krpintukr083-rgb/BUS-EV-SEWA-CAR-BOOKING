const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0');
  await client.connect();
  const db = client.db('transport_booking_db');
  const users = await db.collection('users').find({}).toArray();
  for (const user of users) {
    const role = 'customer';
    let willThrow403 = false;
    const isAdminAccount = user.email && (
      user.email.toLowerCase() === 'admin@platform.com' ||
      user.email.toLowerCase() === 'admin@transportplatform.com' ||
      user.email.toLowerCase().startsWith('admin@')
    );
    if (isAdminAccount || role === 'admin') {
      // skips
    } else if (role === 'driver' || (user.email && user.email.toLowerCase().includes('driver'))) {
      // skips
    } else if (role && user.role !== role) {
      willThrow403 = true;
    }
    if (willThrow403) {
      console.log('User that throws 403:', user.email, 'Role in DB:', user.role);
    }
  }
  await client.close();
}
run().catch(console.dir);
