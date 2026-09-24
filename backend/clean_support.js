const mongoose = require('mongoose');
const uri = "mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0";

async function cleanSupport() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collection = db.collection('supports');
  const countBefore = await collection.countDocuments();
  console.log('SUPPORT COLLECTION: supports');
  console.log('SUPPORT RECORD COUNT BEFORE:', countBefore);
  
  await collection.deleteMany({});
  const countAfter = await collection.countDocuments();
  console.log('SUPPORT RECORD COUNT AFTER:', countAfter);
  mongoose.connection.close();
}

cleanSupport().catch(console.error);
