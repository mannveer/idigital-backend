import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/AppError';
import { LocalStorageService } from './storage/LocalStorageService';

class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(buffer: Buffer, originalname: string, mimetype: string) {
    const fileId = uuidv4();
    const ext = path.extname(originalname);
    const filename = `${fileId}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    try {
      await fs.writeFile(filepath, buffer);
      return {
        fileId: filename,
        url: `/uploads/${filename}`
      };
    } catch (error) {
      throw new AppError('Error uploading file', 500);
    }
  }

  async deleteFile(fileId: string) {
    try {
      const filepath = path.join(this.uploadDir, fileId);
      await fs.unlink(filepath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new AppError('Error deleting file', 500);
      }
    }
  }
}

// Initialize storage service
export const storage = new LocalStorageService(); 