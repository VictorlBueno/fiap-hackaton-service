import {Inject, Injectable} from '@nestjs/common';
import {Video} from '../entities/video.entity';
import {ProcessingJob} from '../entities/processing-job.entity';
import {JobRepositoryPort} from '../ports/repositories/job-repository.port';
import {VideoProcessorPort} from "../ports/gateways/video-processor.port";
import {FileStoragePort} from "../ports/gateways/file-storage.port";

@Injectable()
export class VideoProcessingService {
    constructor(
        @Inject('VideoProcessorPort') private readonly videoProcessor: VideoProcessorPort,
        @Inject('FileStoragePort') private readonly fileStorage: FileStoragePort,
        @Inject('JobRepositoryPort') private readonly jobRepository: JobRepositoryPort,
    ) {
    }

    async processVideo(video: Video): Promise<ProcessingJob> {
        console.log(`🎬 Iniciando processamento para usuário ${video.userId}: ${video.originalName}`);

        const processingJob = ProcessingJob.createProcessing(video.id, video.originalName, video.userId);
        await this.jobRepository.saveJob(processingJob);

        try {
            const tempDir = `temp/${video.id}`;
            const frames = await this.videoProcessor.extractFrames(video.path, tempDir);

            if (frames.length === 0) {
                const failedJob = ProcessingJob.createFailed(
                    video.id,
                    video.originalName,
                    video.userId,
                    'Nenhum frame extraído'
                );
                await this.jobRepository.saveJob(failedJob);
                return failedJob;
            }

            console.log(`📸 Extraídos ${frames.length} frames para usuário ${video.userId}`);

            const zipPath = `outputs/${video.getOutputZipName()}`;
            await this.fileStorage.createZip(frames, zipPath);
            await this.fileStorage.deleteFile(video.path);

            const completedJob = ProcessingJob.createCompleted(
                video.id,
                video.originalName,
                video.userId,
                frames.length,
                video.getOutputZipName()
            );
            await this.jobRepository.saveJob(completedJob);

            console.log(`✅ Processamento concluído para usuário ${video.userId}: ${video.id}`);
            return completedJob;

        } catch (error) {
            console.error(`❌ Erro no processamento para usuário ${video.userId}:`, error.message);
            const failedJob = ProcessingJob.createFailed(
                video.id,
                video.originalName,
                video.userId,
                error.message
            );
            await this.jobRepository.saveJob(failedJob);
            return failedJob;
        }
    }
}