const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
async function test() {
  const form = new FormData();
  form.append('title', 'Test Banner');
  form.append('status', 'active');
  
  // create dummy image
  fs.writeFileSync('test.jpg', 'fake image data');
  form.append('bannerImage', fs.createReadStream('test.jpg'));

  try {
    // We need auth token... wait, I can't easily auth as admin without a token.
    console.log('Needs auth');
  } catch(e) {
    console.log(e.message);
  }
}
test();
