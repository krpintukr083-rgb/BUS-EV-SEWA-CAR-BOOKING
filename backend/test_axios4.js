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

const server = app.listen(5004, async () => {
  fs.writeFileSync('test4.jpg', 'fake image data');

  const api = axios.create({ 
    baseURL: 'http://localhost:5004',
    headers: { 'Content-Type': 'application/json' }
  });

  const form = new FormData();
  form.append('title', 'dfgd');
  form.append('bannerImage', fs.createReadStream('test4.jpg'));

  try {
    console.log('--- TEST 1: Sending FormData with NO explicit Content-Type ---');
    // Using explicit form.getHeaders() since this is Node form-data.
    const res = await api.post('/test', form, { headers: form.getHeaders() });
    console.log('Response:', res.data);
  } catch(e) {
    console.log('Error:', e.message);
  }

  try {
    console.log('\n--- TEST 2: Sending FormData WITH explicit multipart/form-data ---');
    // Simulating the bug
    const res2 = await api.post('/test', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    console.log('Response:', res2.data);
  } catch(e) {
    console.log('Error:', e.message);
  }

  server.close();
  fs.unlinkSync('test4.jpg');
});
