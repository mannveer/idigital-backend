import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import config from '../config';
import { AppError } from '../utils/AppError';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!config.upload.allowedTypes.includes(file.mimetype)) {
    cb(new Error('File type not allowed'));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize
  }
});

export function handleUploadError(
  err: Error | AppError | multer.MulterError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        next(new AppError(`File too large. Maximum size is ${process.env.MAX_FILE_SIZE || '100MB'}`, 400));
        break;
      case 'LIMIT_FILE_COUNT':
        next(new AppError('Too many files uploaded', 400));
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        next(new AppError('Unexpected field name for file upload', 400));
        break;
      default:
        next(new AppError(err.message, 400));
    }
    return;
  }

  if (err.message === 'File type not allowed') {
    next(new AppError(`File type not allowed. Allowed types: ${process.env.ALLOWED_FILE_TYPES || 'all'}`, 400));
    return;
  }

  next(err);
} 