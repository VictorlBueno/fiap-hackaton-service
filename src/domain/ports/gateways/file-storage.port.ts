export interface FileStoragePort {
  deleteFile(path: string): Promise<void>;

  createZip(files: string[], outputPath: string): Promise<void>;

  fileExists(path: string): Promise<boolean>;

  uploadFile(localPath: string, s3Key: string): Promise<string>;

  downloadFile(s3Key: string, localPath: string): Promise<void>;

  getSignedDownloadUrl(s3Key: string, expiresIn?: number): Promise<string>;

  getFileStream(s3Key: string): Promise<NodeJS.ReadableStream>;
}
