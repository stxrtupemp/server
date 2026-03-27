import multer, { FileFilterCallback, StorageEngine } from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BYTES        = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_WIDTH        = 1200;
const WEBP_QUALITY     = 80;

// ─── Sub-directory helpers ────────────────────────────────────────────────────

export type UploadSubdir = 'properties' | 'avatars' | 'documents';

function resolveDir(subdir: UploadSubdir): string {
  const dir = path.join(path.resolve(env.UPLOAD_DIR), subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ─── Multer: memory storage (pipe into sharp) ─────────────────────────────────

const memoryStorage = multer.memoryStorage();

function imageFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (ALLOWED_MIMETYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type "${file.mimetype}". Only JPEG, PNG and WebP are allowed.`,
        422,
        'INVALID_FILE_TYPE',
      ),
    );
  }
}

/** General-purpose image upload middleware (stores in memory for processing). */
export const uploadImage = multer({
  storage:  memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_BYTES,
    files:    1,
  },
});

/** Multi-image upload middleware (max 10 files). */
export const uploadImages = multer({
  storage:  memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_BYTES,
    files:    10,
  },
});

// ─── Sharp resize & save ──────────────────────────────────────────────────────

export interface SavedImage {
  filename:  string;
  url:       string;
  width:     number;
  height:    number;
  sizeBytes: number;
}

/**
 * Resize an uploaded image buffer to MAX_WIDTH and save as WebP.
 *
 * @param buffer  Raw file buffer from Multer memory storage
 * @param subdir  Target sub-directory under UPLOAD_DIR
 * @returns       Metadata about the saved file
 */
export async function resizeAndSave(
  buffer: Buffer,
  subdir: UploadSubdir = 'properties',
): Promise<SavedImage> {
  const dir      = resolveDir(subdir);
  const filename = `${uuidv4()}.webp`;
  const filepath = path.join(dir, filename);

  const { width, height } = await sharp(buffer)
    .resize({
      width:             MAX_WIDTH,
      withoutEnlargement: true,  // never upscale smaller images
      fit:               'inside',
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(filepath);

  const { size } = fs.statSync(filepath);

  return {
    filename,
    url:       `/uploads/${subdir}/${filename}`,
    width:     width  ?? 0,
    height:    height ?? 0,
    sizeBytes: size,
  };
}

/**
 * Process multiple uploaded buffers concurrently.
 */
export async function resizeAndSaveMany(
  files:  Express.Multer.File[],
  subdir: UploadSubdir = 'properties',
): Promise<SavedImage[]> {
  return Promise.all(files.map((f) => resizeAndSave(f.buffer, subdir)));
}

/**
 * Delete an image file from disk given its public URL path.
 * Silently ignores files that no longer exist.
 */
export function deleteImageFile(url: string): void {
  // url format: /uploads/properties/abc.webp
  const relative = url.startsWith('/uploads/')
    ? url.slice('/uploads/'.length)
    : url;

  const filepath = path.join(path.resolve(env.UPLOAD_DIR), relative);

  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

/**
 * Async variant of deleteImageFile — useful in Promise chains.
 */
export async function deleteImageFileAsync(url: string): Promise<void> {
  deleteImageFile(url);
}
