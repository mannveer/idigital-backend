import { StorageService, FileUploadResult } from './StorageService';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IStorageService, SignedUrlOptions } from './IStorageService';
import config from '../../config';
import { AppError } from '../../utils/AppError';

export class LocalStorageService implements StorageService {
  private uploadDir: string;
  private tempDir: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../../uploads');
    this.tempDir = path.join(__dirname, '../../../temp');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
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

  async uploadFile(file: Buffer, originalname: string, mimeType: string): Promise<FileUploadResult> {
    const ext = path.extname(originalname);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);
    
    await fs.writeFile(filePath, file);
    
    return {
      url: `/uploads/${filename}`,
      key: filename
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const filename = path.basename(fileUrl);
    const filePath = path.join(this.uploadDir, filename);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getSignedUrl(fileUrl: string): Promise<string> {
    // For local storage, we just return the URL as is
    return fileUrl;
  }

  async cleanupTempFiles(): Promise<void> {
    const files = await fs.readdir(this.tempDir);
    const oneHourAgo = Date.now() - 3600000;

    for (const file of files) {
      const filePath = path.join(this.tempDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtimeMs < oneHourAgo) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error(`Failed to delete temp file ${file}:`, error);
        }
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