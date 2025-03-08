import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService, FileUploadResult, SignedUrlOptions } from './IStorageService';
import config from '../../config';
import crypto from 'crypto';
import path from 'path';

export class S3StorageService implements IStorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: config.storage.aws.region,
      credentials: {
        accessKeyId: config.storage.aws.accessKeyId!,
        secretAccessKey: config.storage.aws.secretAccessKey!
      }
    });
    this.bucket = config.storage.aws.bucketName!;
  }

  private generateFileId(filename: string): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${filename}${timestamp}`)
      .digest('hex');
    return `${timestamp}-${hash}${path.extname(filename)}`;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<FileUploadResult> {
    const fileId = this.generateFileId(filename);
    
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileId,
      Body: file,
      ContentType: mimeType || 'application/octet-stream'
    });

    await this.s3Client.send(command);

    return {
      url: `https://${this.bucket}.s3.${config.storage.aws.region}.amazonaws.com/${fileId}`,
      fileId,
      size: file.length,
      mimeType: mimeType || 'application/octet-stream'
    };
  }

  async getSignedUrl(
    fileId: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileId,
      ResponseContentType: options.contentType,
      ResponseContentDisposition: options.contentDisposition
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: options.expiresIn || 3600 // 1 hour default
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileId
    });

    await this.s3Client.send(command);
  }
} 