const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0');
  const hash = await bcrypt.hash('user123', 10);
  await mongoose.connection.db.collection('users').updateOne(
    { email: 'priya.nair@example.com' },
    {
      $set: {
        name: 'Priya Nair',
        email: 'priya.nair@example.com',
        phone: '+919844556677',
        password: hash,
        role: 'customer',
        isVerified: true,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
  console.log('SUCCESS: Demo customer Priya Nair upserted with password user123');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
