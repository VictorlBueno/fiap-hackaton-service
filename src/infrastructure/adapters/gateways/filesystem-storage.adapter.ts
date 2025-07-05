import { Injectable } from '@nestjs/common';
import { FileStoragePort } from '../../../domain/ports/gateways/file-storage.port';
import * as fs from 'fs/promises';
import * as archiver from 'archiver';
import * as fsSync from 'fs';
import * as path from 'path';

@Injectable()
export class FilesystemStorageAdapter implements FileStoragePort {
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`Arquivo removido: ${filePath}`);
    } catch (error) {
      console.warn(`Erro ao remover: ${error.message}`);
    }
  }

  async createZip(files: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      files.forEach((file) => {
        archive.file(file, { name: path.basename(file) });
      });
      archive.finalize();
    });
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(localPath: string, s3Key: string): Promise<string> {
    // Para o adaptador de filesystem, apenas retorna o caminho local
    console.log(`Simulando upload para S3: ${s3Key} -> ${localPath}`);
    return localPath;
  }

  async downloadFile(s3Key: string, localPath: string): Promise<void> {
    // Para o adaptador de filesystem, apenas copia o arquivo
    await fs.copyFile(s3Key, localPath);
    console.log(`Arquivo copiado: ${s3Key} -> ${localPath}`);
  }

  async getSignedDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    // Para o adaptador de filesystem, retorna uma URL local
    return `/outputs/${s3Key}`;
  }

  async getFileStream(filePath: string): Promise<NodeJS.ReadableStream> {
    const fs = require('fs');
    return fs.createReadStream(filePath);
  }
}
