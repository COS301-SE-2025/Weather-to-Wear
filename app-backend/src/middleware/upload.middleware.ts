import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request, Response, NextFunction } from "express";

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const useMemory = !!process.env.S3_BUCKET_NAME; 

if (!useMemory) {
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

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

export function markPerfTest(req: Request, _res: Response, next: NextFunction) {
  try {
    const hasHeader = typeof req.header === "function" && !!req.header("X-Test-Run");
    const perfEmail = (process.env.PERF_TEST_EMAIL || "perf@test.com").toLowerCase();
    const userEmail = (req as any)?.user?.email?.toLowerCase?.();
    if (hasHeader || (userEmail && userEmail === perfEmail)) {
      const userId = (req as any)?.user?.id || "anonymous";
      const base = process.env.PERF_TEST_PREFIX || "perf-tests/";
      (req as any).perfPrefix = `${base}users/${userId}/`;
    }
  } catch { /* noop */ }
  next();
}