import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileStoragePort } from '../../../domain/ports/gateways/file-storage.port';
import { s3Config } from '../../config/s3.config';
import * as fs from 'fs/promises';
import * as archiver from 'archiver';
import * as fsSync from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import { promisify } from 'util';

@Injectable()
export class S3StorageAdapter implements FileStoragePort {
  private s3Client: S3Client;

  constructor() {
    console.log(`🔧 Configurando S3 Client - Região: ${s3Config.region}, Bucket: ${s3Config.bucketName}`);
    this.s3Client = new S3Client({
      region: s3Config.region,
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (filePath.startsWith('uploads/') || filePath.startsWith('temp/')) {
        await fs.unlink(filePath);
        console.log(`Arquivo local removido: ${filePath}`);
        return;
      }

      const key = this.getS3Key(filePath);
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: s3Config.bucketName,
          Key: key,
        })
      );
      console.log(`Arquivo S3 removido: ${key}`);
    } catch (error) {
      console.warn(`Erro ao remover arquivo: ${error.message}`);
    }
  }

  async createZip(files: string[], outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const tempZipPath = `/tmp/${path.basename(outputPath)}`;
        const output = fsSync.createWriteStream(tempZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
          try {
            const zipBuffer = await fs.readFile(tempZipPath);
            const s3Key = `outputs/${path.basename(outputPath)}`;
            
            await this.s3Client.send(
              new PutObjectCommand({
                Bucket: s3Config.bucketName,
                Key: s3Key,
                Body: zipBuffer,
                ContentType: 'application/zip',
              })
            );

            await fs.unlink(tempZipPath);
            console.log(`ZIP criado e enviado para S3: ${s3Key}`);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        archive.on('error', (err) => reject(err));
        archive.pipe(output);

        let addedFiles = 0;
        for (const file of files) {
          if (await this.fileExists(file)) {
            const fileName = path.basename(file);
            archive.file(file, { name: fileName });
            addedFiles++;
            console.log(`📦 Adicionando ao ZIP: ${fileName}`);
          } else {
            console.log(`⚠️ Arquivo não encontrado: ${file}`);
          }
        }
        
        if (addedFiles === 0) {
          throw new Error('Nenhum arquivo foi adicionado ao ZIP');
        }
        
        console.log(`📦 Total de arquivos adicionados ao ZIP: ${addedFiles}`);

        archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      if (filePath.startsWith('uploads/') && filePath.includes('T')) {
        await fs.access(filePath);
        console.log(`✅ Arquivo local encontrado: ${filePath}`);
        return true;
      }
      
      if (filePath.startsWith('temp/')) {
        await fs.access(filePath);
        console.log(`✅ Arquivo local encontrado: ${filePath}`);
        return true;
      }

      const key = this.getS3Key(filePath);
      console.log(`🔍 Verificando existência no S3: ${key}`);
      
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: s3Config.bucketName,
          Key: key,
        })
      );
      console.log(`✅ Arquivo encontrado no S3: ${key}`);
      return true;
    } catch (error) {
      console.log(`❌ Arquivo não encontrado: ${filePath} - ${error.message}`);
      return false;
    }
  }

  async uploadFile(localPath: string, s3Key: string): Promise<string> {
    try {
      console.log(`📤 Tentando upload para S3 - Bucket: ${s3Config.bucketName}, Key: ${s3Key}, Região: ${s3Config.region}`);
      const fileBuffer = await fs.readFile(localPath);
      
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: s3Config.bucketName,
          Key: s3Key,
          Body: fileBuffer,
        })
      );

      console.log(`✅ Arquivo enviado para S3: ${s3Key}`);
      return s3Key;
    } catch (error) {
      console.error(`❌ Erro detalhado do S3:`, error);
      if (error.message.includes('endpoint')) {
        throw new Error(`Erro de região S3: O bucket '${s3Config.bucketName}' não está na região '${s3Config.region}'. Verifique a configuração AWS_REGION.`);
      }
      throw new Error(`Erro ao fazer upload para S3: ${error.message}`);
    }
  }

  async downloadFile(s3Key: string, localPath: string): Promise<void> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: s3Config.bucketName,
          Key: s3Key,
        })
      );

      if (response.Body instanceof stream.Readable) {
        const writeStream = fsSync.createWriteStream(localPath);
        response.Body.pipe(writeStream);
        
        return new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      }
    } catch (error) {
      throw new Error(`Erro ao baixar arquivo do S3: ${error.message}`);
    }
  }

  async getSignedDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      console.log(`🔗 Gerando URL assinada para S3 - Bucket: ${s3Config.bucketName}, Key: ${s3Key}`);
      
      const exists = await this.fileExists(s3Key);
      if (!exists) {
        throw new Error(`Arquivo não encontrado no S3: ${s3Key}`);
      }
      
      const command = new GetObjectCommand({
        Bucket: s3Config.bucketName,
        Key: s3Key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      console.log(`✅ URL assinada gerada: ${signedUrl.substring(0, 100)}...`);
      
      return signedUrl;
    } catch (error) {
      console.error(`❌ Erro ao gerar URL assinada: ${error.message}`);
      throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
    }
  }

  async getFileStream(s3Key: string): Promise<stream.Readable> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: s3Config.bucketName,
        Key: this.getS3Key(s3Key),
      })
    );
    if (!(response.Body instanceof stream.Readable)) {
      throw new Error('Body não é um stream');
    }
    return response.Body;
  }

  private getS3Key(filePath: string): string {
    if (filePath.startsWith('uploads/') || filePath.startsWith('outputs/')) {
      return filePath;
    }
    
    if (filePath.startsWith('temp/')) {
      return path.basename(filePath);
    }
    
    return filePath;
  }
} 