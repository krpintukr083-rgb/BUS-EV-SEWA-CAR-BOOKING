const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
mongoose.connect('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const db = mongoose.connection.db;
  const hash = await bcrypt.hash('admin123', 10);
  await db.collection('users').updateOne({ email: 'admin@platform.com' }, { $set: { password: hash } });
  console.log('Password reset to admin123');
  process.exit(0);
});
