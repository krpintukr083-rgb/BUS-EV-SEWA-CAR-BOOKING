const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer();

app.post('/test', upload.any(), (req, res) => {
  res.json({ 
    success: true, 
    filesLength: req.files ? req.files.length : 0, 
    bodyTitle: req.body.title 
  });
});

const server = app.listen(5003, async () => {
  fs.writeFileSync('test3.jpg', 'fake image data');

  const api = axios.create({ 
    baseURL: 'http://localhost:5003',
    headers: { 'Content-Type': 'application/json' }
  });

  const form = new FormData();
  form.append('title', 'dfgd');
  form.append('bannerImage', fs.createReadStream('test3.jpg'));

  try {
    console.log('--- TEST 1: Sending FormData with NO header overrides ---');
    // Note: Node's form-data requires explicit headers because Axios doesn't automatically detect it in Node environment the same way it does in Browser.
    // However, I want to see what happens if I send it as application/json.
    const res = await api.post('/test', form);
    console.log('Response:', res.data);
  } catch(e) {
    console.log('Error:', e.message);
  }

  server.close();
  fs.unlinkSync('test3.jpg');
});
