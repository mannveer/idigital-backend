export interface FileUploadResult {
  fileId: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  contentType?: string;
  contentDisposition?: string;
}

export interface IStorageService {
  uploadFile(
    file: Buffer,
    originalname: string,
    mimeType: string
  ): Promise<FileUploadResult>;

  getSignedUrl(
    fileId: string,
    options?: SignedUrlOptions
  ): Promise<string>;

  deleteFile(fileId: string): Promise<void>;
} 