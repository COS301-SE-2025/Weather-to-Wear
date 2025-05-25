// import multer from 'multer';
// import path from 'path';

// // Write files into the project’s uploads/ folder:
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, 'uploads/'),
//   filename: (_req, file, cb) => {
//     // e.g. “1623456789012-123456789.png”
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     cb(null, unique + path.extname(file.originalname));
//   }
// });

// export const upload = multer({ storage });

import multer from 'multer';
import path from 'path';

// __dirname  = .../app-backend/src/middleware
// path.join up two levels to hit app-backend/uploads
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });


// this is the version that does not use the upload folder.
// // src/middleware/upload.middleware.ts
// import multer from 'multer';

// // Tell Multer to keep files in memory so we can read file.buffer
// const storage = multer.memoryStorage();

// export const upload = multer({ storage });

