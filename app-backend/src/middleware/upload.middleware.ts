import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const useMemory = !!process.env.S3_BUCKET_NAME; // cloud mode if S3 is configured
console.log(`[upload.middleware] useMemory=${useMemory} bucket=${process.env.S3_BUCKET_NAME ?? 'unset'}`);

if (!useMemory) {
  // Ensure the folder exists for local/dev disk storage
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {}
}

const storage = useMemory
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, unique + path.extname(file.originalname));
      },
    });

// allow up to ~15MB per file (tweak as needed)
export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});
