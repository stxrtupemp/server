import multer, { FileFilterCallback } from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_BYTES    = env.MAX_FILE_SIZE_MB * 1024 * 1024;

// ─── Memory storage (pipe directly into sharp) ───────────────────────────────

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 422, 'INVALID_FILE_TYPE'));
  }
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 10 },
});

// ─── Image processor ─────────────────────────────────────────────────────────

interface ProcessedImage {
  filename: string;
  url:      string;
}

export async function processAndSaveImage(
  buffer: Buffer,
  subdir = 'properties',
): Promise<ProcessedImage> {
  const dir = path.join(path.resolve(env.UPLOAD_DIR), subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${uuidv4()}.webp`;
  const filepath = path.join(dir, filename);

  await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(filepath);

  return { filename, url: `/uploads/${subdir}/${filename}` };
}

export async function deleteImageFile(url: string): Promise<void> {
  const relative = url.startsWith('/uploads/') ? url.slice(9) : url;
  const filepath  = path.join(path.resolve(env.UPLOAD_DIR), relative);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}
