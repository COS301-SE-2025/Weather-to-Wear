// // src/middleware/upload.middleware.ts
// import multer from 'multer';
// import path from 'path';

// // Disk storage: write files into the project’s uploads/ folder:
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, 'uploads/'),
//   filename: (_req, file, cb) => {
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     cb(null, unique + path.extname(file.originalname));
//   }
// });

// export const upload = multer({ storage }); // if this one does not work try the one below it
// // export const upload = multer({ storage: multer.memoryStorage() }); 

// src/middleware/upload.middleware.ts
import multer from 'multer';

// Tell Multer to keep files in memory so we can read file.buffer
const storage = multer.memoryStorage();

export const upload = multer({ storage });

