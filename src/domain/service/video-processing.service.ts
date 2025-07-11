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
      { userId: video.userId }
    );

    await this.jobRepository.updateJobVideoPath(video.id, video.path);

    try {
      const s3VideoKey = `uploads/${video.id}_${video.originalName}`;
      
      const s3VideoExists = await this.fileStorage.fileExists(s3VideoKey);
      if (!s3VideoExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          `Arquivo de vídeo não encontrado no S3: ${s3VideoKey}`,
          { userId: video.userId }
        );
        throw new Error(`Arquivo de vídeo não encontrado no S3: ${s3VideoKey}`);
      }

      const tempVideoPath = `/tmp/${video.id}_${video.originalName}`;
      console.log(`📥 Fazendo download temporário do S3: ${s3VideoKey} -> ${tempVideoPath}`);
      
      try {
        await this.fileStorage.downloadFile(s3VideoKey, tempVideoPath);
        console.log(`✅ Download temporário concluído: ${tempVideoPath}`);
      } catch (downloadError) {
        console.error(`❌ Erro no download do S3: ${downloadError.message}`);
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          `Erro ao baixar arquivo do S3: ${downloadError.message}`,
          { userId: video.userId }
        );
        throw new Error(`Erro ao baixar arquivo do S3: ${downloadError.message}`);
      }

      const tempDir = `/tmp/frames_${video.id}`;

      const frames = await this.videoProcessor.extractFrames(
        tempVideoPath,
        tempDir,
      );

      if (frames.length === 0) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          'Nenhum frame extraído do vídeo',
          { userId: video.userId }
        );
        throw new Error('Nenhum frame extraído do vídeo');
      }

      const zipFilename = `${video.id}.zip`;
      const tempZipPath = `/tmp/${zipFilename}`;

      await this.fileStorage.createZip(frames, tempZipPath);

      const s3ZipKey = `outputs/${zipFilename}`;
      try {
        await this.fileStorage.uploadFile(tempZipPath, s3ZipKey);
        console.log(`✅ ZIP enviado para S3: ${s3ZipKey}`);
      } catch (uploadError) {
        console.error(`❌ Erro no upload do ZIP para S3: ${uploadError.message}`);
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          `Erro ao enviar ZIP para S3: ${uploadError.message}`,
          { userId: video.userId }
        );
        throw new Error(`Erro ao enviar ZIP para S3: ${uploadError.message}`);
      }

      const zipExists = await this.fileStorage.fileExists(s3ZipKey);
      if (!zipExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          'Falha ao criar arquivo ZIP no S3',
          { userId: video.userId }
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
          userId: video.userId
        },
      );

      try {
        await this.fileStorage.deleteFile(tempVideoPath);
        await this.fileStorage.deleteFile(tempZipPath);
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`🧹 Arquivos temporários removidos`);
      } catch (cleanupError) {
        console.warn(`⚠️ Erro na limpeza de arquivos temporários: ${cleanupError.message}`);
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
        { userId: video.userId }
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
