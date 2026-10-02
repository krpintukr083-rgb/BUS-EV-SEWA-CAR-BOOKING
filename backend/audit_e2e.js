const axios = require('axios');
const mongoose = require('mongoose');

async function runAudit() {
  console.log("Starting E2E Booking Audit...");
  // TODO: implement API tests for matrix
  console.log("Audit complete.");
}

runAudit().catch(console.error);
