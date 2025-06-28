import {Injectable} from '@nestjs/common';
import {JobRepositoryPort} from '../../../domain/ports/repositories/job-repository.port';
import {ProcessingJob} from '../../../domain/entities/processing-job.entity';
import {ProcessedFile} from '../../../domain/entities/processed-file.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FileJobRepositoryAdapter implements JobRepositoryPort {
    private jobs = new Map<string, ProcessingJob>();

    async saveJob(job: ProcessingJob): Promise<void> {
        this.jobs.set(job.id, job);
        console.log(`💾 Job salvo: ${job.id} - ${job.status}`);
    }

    async findJobById(id: string): Promise<ProcessingJob | null> {
        const job = this.jobs.get(id);
        if (!job) {
            return this.inferJobFromFilesystem(id);
        }
        return job;
    }

    async getProcessedFiles(): Promise<ProcessedFile[]> {
        try {
            const files = await fs.readdir('outputs');
            const zipFiles = files.filter(file => file.endsWith('.zip'));

            const results: ProcessedFile[] = [];
            for (const file of zipFiles) {
                const filePath = path.join('outputs', file);
                const stats = await fs.stat(filePath);

                results.push(new ProcessedFile(
                    file,
                    stats.size,
                    stats.mtime,
                    `/download/${file}`
                ));
            }

            return results;
        } catch (error) {
            console.error('❌ Erro ao listar arquivos:', error.message);
            return [];
        }
    }

    private async inferJobFromFilesystem(jobId: string): Promise<ProcessingJob | null> {
        try {
            const zipPath = path.join('outputs', `frames_${jobId}.zip`);
            const zipExists = await fs.access(zipPath).then(() => true).catch(() => false);

            if (zipExists) {
                return ProcessingJob.createCompleted(jobId, 'video.mp4', 0, `frames_${jobId}.zip`);
            }

            const uploadsFiles = await fs.readdir('uploads');
            const videoExists = uploadsFiles.some(file => file.includes(jobId));

            if (videoExists) {
                return ProcessingJob.createProcessing(jobId, 'video.mp4');
            }

            return ProcessingJob.createFailed(jobId, 'video.mp4', 'Job não encontrado');
        } catch {
            return null;
        }
    }
}