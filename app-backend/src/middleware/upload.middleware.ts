import multer from 'multer';
import path from 'path';

/**
 * Directory path for file uploads storage
 * Located two levels up from current directory in 'uploads' folder
 */
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

console.log('→ Multer will write to:', UPLOADS_DIR);


/**
 * Multer disk storage configuration
 * - Sets destination directory for uploads
 * - Generates unique filenames with original extensions
 */
const storage = multer.diskStorage({

    /**
   * Sets the destination directory for uploaded files
   * @param _req - Express request object (unused)
   * @param _file - File object from multer (unused)
   * @param cb - Callback function to set destination
   */
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),

    /**
   * Generates unique filename for uploaded file
   * Format: timestamp-randomNumber.originalExtension
   * @param _req - Express request object (unused)
   * @param file - File object from multer
   * @param cb - Callback function to set filename
   */
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });

