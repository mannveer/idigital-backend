import { v2 as cloudinary } from 'cloudinary';
import { IStorageService, FileUploadResult, SignedUrlOptions } from './IStorageService';
import config from '../../config';
import crypto from 'crypto';

export class CloudinaryStorageService implements IStorageService {
  constructor() {
    cloudinary.config({
      cloud_name: config.storage.cloudinary.cloudName,
      api_key: config.storage.cloudinary.apiKey,
      api_secret: config.storage.cloudinary.apiSecret
    });
  }

  private generateFileId(filename: string): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${filename}${timestamp}`)
      .digest('hex');
    return `${timestamp}-${hash}`;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<FileUploadResult> {
    const fileId = this.generateFileId(filename);
    
    // Convert buffer to base64
    const base64File = file.toString('base64');
    const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${base64File}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: fileId,
      resource_type: 'auto'
    });

    return {
      url: result.secure_url,
      fileId: result.public_id,
      size: result.bytes,
      mimeType: result.resource_type
    };
  }

  async getSignedUrl(
    fileId: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000) + (options.expiresIn || 3600);
    
    return cloudinary.utils.private_download_url(fileId, '', {
      expires_at: timestamp,
      attachment: options.contentDisposition === 'attachment',
      type: options.contentType
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    await cloudinary.uploader.destroy(fileId);
  }
} 