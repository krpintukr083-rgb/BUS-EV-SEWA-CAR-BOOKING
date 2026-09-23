const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/test', upload.any(), (req, res) => {
  console.log('req.files:', req.files);
  console.log('req.body:', req.body);
  res.json({ success: true, files: req.files });
});

const server = app.listen(5001, async () => {
  console.log('Server started');
  
  // Create a file
  fs.writeFileSync('test.txt', 'hello');

  const form = new FormData();
  form.append('bannerImage', fs.createReadStream('test.txt'));
  form.append('title', 'Test');

  const api = axios.create({
    baseURL: 'http://localhost:5001',
    headers: { 'Content-Type': 'application/json' }
  });

  try {
    console.log('--- TEST 1: with explicit multipart/form-data ---');
    await api.post('/test', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  } catch(e) {
    console.log('Test 1 failed:', e.message);
  }

  try {
    console.log('\n--- TEST 2: without Content-Type override ---');
    await api.post('/test', form);
  } catch(e) {
    console.log('Test 2 failed:', e.message);
  }

  server.close();
  fs.unlinkSync('test.txt');
});
