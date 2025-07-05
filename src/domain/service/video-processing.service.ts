import { Inject, Injectable } from '@nestjs/common';
import { Video } from '../entities/video.entity';
import { JobStatus, ProcessingJob } from '../entities/processing-job.entity';
import { VideoProcessorPort } from '../ports/gateways/video-processor.port';
import { FileStoragePort } from '../ports/gateways/file-storage.port';
import { JobRepositoryPort } from '../ports/repositories/job-repository.port';
import * as fs from 'fs/promises';

@Injectable()
export class VideoProcessingService {
  constructor(
    @Inject('VideoProcessorPort')
    private readonly videoProcessor: VideoProcessorPort,
    @Inject('FileStoragePort') private readonly fileStorage: FileStoragePort,
    @Inject('JobRepositoryPort')
    private readonly jobRepository: JobRepositoryPort,
  ) {}

  async processVideo(video: Video): Promise<ProcessingJob | null> {
    console.log(
      `Iniciando processamento para usuário ${video.userId}: ${video.originalName}`,
    );

    await this.jobRepository.updateJobStatus(
      video.id,
      JobStatus.PROCESSING,
      'Processando vídeo e extraindo frames...',
    );

    await this.jobRepository.updateJobVideoPath(video.id, video.path);

    try {
      // O video.path contém o caminho local do arquivo (ex: uploads/2025-07-05T17-52-18-297Z_SampleVideo_1280x720_1mb.mp4)
      // Primeiro verifica se o arquivo local existe
      const videoExists = await this.fileStorage.fileExists(video.path);
      if (!videoExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          `Arquivo de vídeo local não encontrado: ${video.path}`,
        );
        throw new Error(`Arquivo de vídeo local não encontrado: ${video.path}`);
      }

      // Faz upload do vídeo para o S3 com nome padronizado
      const s3VideoKey = `uploads/${video.id}_${video.originalName}`;
      await this.fileStorage.uploadFile(video.path, s3VideoKey);
      console.log(`Vídeo enviado para S3: ${s3VideoKey}`);

      // Verifica se o upload para S3 foi bem-sucedido
      const s3VideoExists = await this.fileStorage.fileExists(s3VideoKey);
      if (!s3VideoExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          `Falha no upload do vídeo para S3: ${s3VideoKey}`,
        );
        throw new Error(`Falha no upload do vídeo para S3: ${s3VideoKey}`);
      }

      const tempDir = `temp/${video.id}`;
      console.log(`📁 Criando diretório temporário: ${tempDir}`);

      const frames = await this.videoProcessor.extractFrames(
        video.path,
        tempDir,
      );

      if (frames.length === 0) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          'Nenhum frame extraído do vídeo',
        );
        throw new Error('Nenhum frame extraído do vídeo');
      }

      console.log(
        `Extraídos ${frames.length} frames para usuário ${video.userId}`,
      );

      const zipFilename = `${video.id}.zip`;
      const zipPath = `outputs/${zipFilename}`;
      console.log(`Criando ZIP: ${zipPath}`);

      await this.fileStorage.createZip(frames, zipPath);

      // Verifica se o ZIP foi criado no S3
      const s3ZipKey = `outputs/${zipFilename}`;
      const zipExists = await this.fileStorage.fileExists(s3ZipKey);
      if (!zipExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          'Falha ao criar arquivo ZIP no S3',
        );
        throw new Error('Falha ao criar arquivo ZIP no S3');
      }

      console.log(`ZIP criado com sucesso no S3: ${s3ZipKey}`);

      await this.jobRepository.updateJobStatus(
        video.id,
        JobStatus.COMPLETED,
        `Processamento concluído! ${frames.length} frames extraídos.`,
        {
          frameCount: frames.length,
          zipPath: zipFilename,
        },
      );

      // Remove arquivos temporários
      await this.fileStorage.deleteFile(video.path);
      
      // Remove pasta temporária com frames
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`🗑️ Pasta temporária removida: ${tempDir}`);
      } catch (error) {
        console.warn(`⚠️ Erro ao remover pasta temporária: ${error.message}`);
      }

      console.log(
        `Processamento concluído para usuário ${video.userId}: ${video.id}`,
      );

      return await this.jobRepository.findJobById(video.id, video.userId);
    } catch (error) {
      console.error(
        `Erro no processamento para usuário ${video.userId}:`,
        error.message,
      );

      await this.jobRepository.updateJobStatus(
        video.id,
        JobStatus.FAILED,
        error.message,
      );

      throw error;
    }
  }
}
