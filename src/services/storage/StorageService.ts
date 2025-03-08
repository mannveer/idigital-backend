export interface FileUploadResult {
  url: string;
  key: string;
}

export interface StorageService {
  uploadFile(file: Buffer, originalname: string, mimeType: string): Promise<FileUploadResult>;
  deleteFile(fileUrl: string): Promise<void>;
  getSignedUrl(fileUrl: string): Promise<string>;
  cleanupTempFiles(): Promise<void>;
} 