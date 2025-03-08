import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IStorageService, FileUploadResult, SignedUrlOptions } from './IStorageService';
import config from '../../config';
import { AppError } from '../../middleware/error';

export class LocalStorageService implements IStorageService {
  private uploadDir: string;
  private tempDir: string;

  constructor() {
    this.uploadDir = config.storage.local.uploadDir;
    this.tempDir = config.storage.local.tempDir;
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private generateFileId(originalname: string): string {
    const timestamp = Date.now();
    const hash = crypto
      .createHash('md5')
      .update(`${originalname}${timestamp}`)
      .digest('hex');
    const ext = path.extname(originalname);
    return `${timestamp}-${hash}${ext}`;
  }

  private getFilePath(fileId: string): string {
    return path.join(this.uploadDir, fileId);
  }

  private getTempPath(fileId: string): string {
    return path.join(this.tempDir, fileId);
  }

  async uploadFile(
    file: Buffer,
    originalname: string,
    mimeType: string
  ): Promise<FileUploadResult> {
    try {
      const fileId = this.generateFileId(originalname);
      const filePath = this.getFilePath(fileId);

      // Write file to disk
      await fs.writeFile(filePath, file);

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        fileId,
        url: `/uploads/${fileId}`,
        size: stats.size,
        mimeType
      };
    } catch (error) {
      throw new AppError('Error uploading file', 500);
    }
  }

  async getSignedUrl(
    fileId: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    try {
      const filePath = this.getFilePath(fileId);
      await fs.access(filePath);

      // For local storage, we'll create a temporary copy with a random name
      const tempId = this.generateFileId(fileId);
      const tempPath = this.getTempPath(tempId);

      // Copy file to temp directory
      await fs.copyFile(filePath, tempPath);

      // Set expiry for temp file
      setTimeout(async () => {
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore errors during cleanup
        }
      }, (options.expiresIn || 3600) * 1000);

      // Return path to temp file
      return `/temp/${tempId}`;
    } catch (error) {
      throw new AppError('File not found', 404);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const filePath = this.getFilePath(fileId);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new AppError('Error deleting file', 500);
      }
    }
  }

  // Additional utility methods
  async getFileStream(fileId: string): Promise<fs.FileHandle> {
    try {
      const filePath = this.getFilePath(fileId);
      return fs.open(filePath, 'r');
    } catch (error) {
      throw new AppError('File not found', 404);
    }
  }

  async getFileMimeType(fileId: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(fileId);
      const ext = path.extname(filePath).toLowerCase();
      
      // Basic MIME type mapping
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      return mimeTypes[ext] || null;
    } catch {
      return null;
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Delete files older than 1 hour
        if (now - stats.mtimeMs > 3600000) {
          try {
            await fs.unlink(filePath);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }

  // Additional methods for local storage
  async verifyToken(token: string): Promise<{
    fileId: string;
    contentType?: string;
    contentDisposition?: string;
  }> {
    try {
      return jwt.verify(token, config.jwt.secret) as {
        fileId: string;
        contentType?: string;
        contentDisposition?: string;
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getFile(fileId: string): Promise<Buffer> {
    const filePath = this.getFilePath(fileId);
    return fs.readFile(filePath);
  }
} 