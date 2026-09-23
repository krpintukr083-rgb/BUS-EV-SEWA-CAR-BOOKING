import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer();

app.use(express.json());

app.post('/api/admin/banners', upload.any(), (req, res) => {
  console.log('--- POST /api/admin/banners ---');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('req.files:', req.files);
  console.log('req.body:', req.body);
  res.json({ success: true, files: req.files, body: req.body });
});

app.listen(5006, () => console.log('Backend listening on 5006'));
