import { Injectable, Inject } from '@nestjs/common';
import { Video } from '../../domain/entities/video.entity';
import { ProcessingJob } from '../../domain/entities/processing-job.entity';
import { QueuePort, QueueMessage } from '../../domain/ports/gateways/queue.port';
import { JobRepositoryPort } from '../../domain/ports/repositories/job-repository.port';
import { FileStoragePort } from '../../domain/ports/gateways/file-storage.port';
import { UploadResponse } from '../ports/controllers/video-upload.port';

@Injectable()
export class UploadVideoUseCase {
    constructor(
        @Inject('QueuePort') private readonly queue: QueuePort,
        @Inject('JobRepositoryPort') private readonly jobRepository: JobRepositoryPort,
        @Inject('FileStoragePort') private readonly fileStorage: FileStoragePort,
    ) {}

    async execute(file: Express.Multer.File): Promise<UploadResponse> {
        if (!file) {
            return { success: false, message: 'Nenhum arquivo recebido' };
        }

        const video = Video.create(file.originalname, file.path, file.size);

        if (!video.isValidFormat()) {
            await this.fileStorage.deleteFile(file.path);
            return {
                success: false,
                message: 'Formato não suportado. Use: mp4, avi, mov, mkv, wmv, flv, webm'
            };
        }

        const job = ProcessingJob.createPending(video.id, video.originalName);
        await this.jobRepository.saveJob(job);

        const message: QueueMessage = {
            id: video.id,
            videoPath: video.path,
            videoName: video.originalName,
        };

        const queued = await this.queue.sendMessage(message);

        if (queued) {
            return {
                success: true,
                message: 'Vídeo adicionado à fila com sucesso! Aguarde o processamento.',
                jobId: video.id,
                statusUrl: `/api/job/${video.id}`
            };
        } else {
            return {
                success: false,
                message: 'Erro ao adicionar vídeo à fila. Tente novamente.'
            };
        }
    }
}