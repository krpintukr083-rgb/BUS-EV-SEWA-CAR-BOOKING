import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer();

app.post('/api/admin/banners', upload.any(), (req, res) => {
  console.log('req.files:', req.files);
  console.log('req.body:', req.body);
  res.json({ success: true });
});

const server = app.listen(5005, async () => {
  console.log('Server running on 5005');
  
  // Fake api.js
  const api = axios.create({
    baseURL: 'http://localhost:5005/api',
    headers: { 'Content-Type': 'application/json' }
  });

  fs.writeFileSync('test_banner.jpg', 'fake image data');

  const formData = new FormData();
  formData.append('title', 'dfgdfgd');
  formData.append('subtitle', 'dfgdgd');
  formData.append('status', 'active');
  formData.append('sortOrder', '3');
  formData.append('bannerImage', fs.createReadStream('test_banner.jpg'));

  try {
    // This is what adminService.createBanner does now:
    console.log('Sending request without overriding Content-Type...');
    await api.post('/admin/banners', formData, {
      headers: formData.getHeaders() // In Node we need this, but browser Axios does this automatically
    });
  } catch(e) {
    console.error('Error:', e.message);
  }

  server.close();
  fs.unlinkSync('test_banner.jpg');
});
