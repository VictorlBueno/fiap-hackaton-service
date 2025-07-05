import { Inject, Injectable } from '@nestjs/common';
import { Video } from '../entities/video.entity';
import { JobStatus, ProcessingJob } from '../entities/processing-job.entity';
import { VideoProcessorPort } from '../ports/gateways/video-processor.port';
import { FileStoragePort } from '../ports/gateways/file-storage.port';
import { JobRepositoryPort } from '../ports/repositories/job-repository.port';
import { EmailNotificationService } from './email-notification.service';
import * as fs from 'fs/promises';

@Injectable()
export class VideoProcessingService {
  constructor(
    @Inject('VideoProcessorPort')
    private readonly videoProcessor: VideoProcessorPort,
    @Inject('FileStoragePort') private readonly fileStorage: FileStoragePort,
    @Inject('JobRepositoryPort')
    private readonly jobRepository: JobRepositoryPort,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async processVideo(video: Video, userSub: string): Promise<ProcessingJob | null> {
    await this.jobRepository.updateJobStatus(
      video.id,
      JobStatus.PROCESSING,
      'Processando vídeo e extraindo frames...',
    );

    await this.jobRepository.updateJobVideoPath(video.id, video.path);

    try {
      const videoExists = await this.fileStorage.fileExists(video.path);
      if (!videoExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          `Arquivo de vídeo local não encontrado: ${video.path}`,
        );
        throw new Error(`Arquivo de vídeo local não encontrado: ${video.path}`);
      }

      const s3VideoKey = `uploads/${video.id}_${video.originalName}`;
      await this.fileStorage.uploadFile(video.path, s3VideoKey);

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

      const zipFilename = `${video.id}.zip`;
      const zipPath = `outputs/${zipFilename}`;

      await this.fileStorage.createZip(frames, zipPath);

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

      await this.jobRepository.updateJobStatus(
        video.id,
        JobStatus.COMPLETED,
        `Processamento concluído! ${frames.length} frames extraídos.`,
        {
          frameCount: frames.length,
          zipPath: zipFilename,
        },
      );

      await this.fileStorage.deleteFile(video.path);
      
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Erro ao remover pasta temporária: ${error.message}`);
      }

      const result = await this.jobRepository.findJobById(video.id, video.userId);
      
      if (result) {
        try {
          await this.emailNotificationService.notifyVideoProcessingComplete(result, userSub);
        } catch (emailError) {
          console.warn(`Erro ao enviar e-mail de notificação: ${emailError.message}`);
        }
      }

      return result;
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

      try {
        const failedJob = await this.jobRepository.findJobById(video.id, video.userId);
        if (failedJob) {
          await this.emailNotificationService.notifyVideoProcessingComplete(failedJob, userSub);
        }
      } catch (emailError) {
        console.warn(`Erro ao enviar e-mail de notificação de erro: ${emailError.message}`);
      }

      throw error;
    }
  }
}
