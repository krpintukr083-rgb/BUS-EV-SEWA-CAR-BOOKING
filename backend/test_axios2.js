const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer();

app.post('/test', upload.any(), (req, res) => {
  console.log('req.files length:', req.files ? req.files.length : 0);
  console.log('req.body:', req.body);
  res.json({ success: true, body: req.body });
});

const server = app.listen(5002, async () => {
  fs.writeFileSync('test2.txt', 'hello2');

  const api = axios.create({ baseURL: 'http://localhost:5002' });

  // Add an interceptor to explicitly drop the Content-Type header so browser logic works.
  // Wait, in Node.js FormData is different.
  
  const form = new FormData();
  form.append('title', 'dfgd');
  form.append('bannerImage', fs.createReadStream('test2.txt'));

  try {
    // What if we do NOT set headers, just send form?
    await api.post('/test', form, { headers: form.getHeaders() });
  } catch(e) {
    console.log(e.message);
  }

  server.close();
  fs.unlinkSync('test2.txt');
});
