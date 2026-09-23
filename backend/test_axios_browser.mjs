import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/upload', upload.any(), (req, res) => {
  console.log('--- POST /api/upload ---');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('req.files:', req.files);
  console.log('req.body:', req.body);
  res.json({ success: true });
});

app.listen(5007, () => console.log('Listening on 5007'));
