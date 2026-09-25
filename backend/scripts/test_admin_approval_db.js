const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Schedule = require('../src/models/Schedule');

async function checkAndApprove() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const schedule = await Schedule.findById('6ab5f8aa522f467752afacad');
  console.log("Before approval:", schedule.status);
  
  schedule.status = 'Active';
  await schedule.save();
  
  console.log("After approval:", schedule.status);
  
  // Now create another schedule and reject it
  const rejectedSchedule = await Schedule.create({
    vehicle: schedule.vehicle,
    driver: schedule.driver,
    origin: 'Delhi',
    destination: 'Agra',
    travelDate: new Date(),
    departureTime: '11:00 AM',
    fareRate: 600,
    status: 'Pending'
  });
  console.log("Created another pending schedule:", rejectedSchedule._id);
  
  rejectedSchedule.status = 'Rejected';
  rejectedSchedule.rejectionReason = 'Not valid route';
  await rejectedSchedule.save();
  
  console.log("After rejection:", rejectedSchedule.status, rejectedSchedule.rejectionReason);
  
  process.exit(0);
}
checkAndApprove();
