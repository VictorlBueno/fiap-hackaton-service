import { Inject, Injectable } from '@nestjs/common';
import { Video } from '../entities/video.entity';
import { JobStatus, ProcessingJob } from '../entities/processing-job.entity';
import { VideoProcessorPort } from '../ports/gateways/video-processor.port';
import { FileStoragePort } from '../ports/gateways/file-storage.port';
import { JobRepositoryPort } from '../ports/repositories/job-repository.port';

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
      const videoExists = await this.fileStorage.fileExists(video.path);
      if (!videoExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          `Arquivo de vídeo não encontrado: ${video.path}`,
        );
        throw new Error(`Arquivo de vídeo não encontrado: ${video.path}`);
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

      const zipExists = await this.fileStorage.fileExists(zipPath);
      if (!zipExists) {
        await this.jobRepository.updateJobStatus(
          video.id,
          JobStatus.FAILED,
          'Falha ao criar arquivo ZIP',
        );
        throw new Error('Falha ao criar arquivo ZIP');
      }

      console.log(`ZIP criado com sucesso: ${zipPath}`);

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
