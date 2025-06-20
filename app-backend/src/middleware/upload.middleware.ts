
import multer from 'multer';
import path from 'path';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

console.log('→ Multer will write to:', UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });

