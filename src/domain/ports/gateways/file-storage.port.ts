export interface FileStoragePort {
  deleteFile(path: string): Promise<void>;

  createZip(files: string[], outputPath: string): Promise<void>;

  fileExists(path: string): Promise<boolean>;
}
