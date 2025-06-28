import {ProcessedFile} from "../../../domain/entities/processed-file.entity";
import {ProcessingJob} from "../../../domain/entities/processing-job.entity";
import {JobRepositoryPort} from "../../../domain/ports/repositories/job-repository.port";
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileJobRepositoryAdapter implements JobRepositoryPort {
    private jobs = new Map<string, ProcessingJob>();

    async saveJob(job: ProcessingJob): Promise<void> {
        this.jobs.set(job.id, job);
        console.log(`💾 Job salvo para usuário ${job.userId}: ${job.id} - ${job.status}`);
    }

    async findJobById(id: string, userId: string): Promise<ProcessingJob | null> {
        const job = this.jobs.get(id);

        // Verifica se o job existe E pertence ao usuário
        if (!job || job.userId !== userId) {
            console.warn(`🔒 Tentativa de acesso negada: Job ${id} para usuário ${userId}`);
            return null;
        }

        return job;
    }

    async getProcessedFilesByUser(userId: string): Promise<ProcessedFile[]> {
        try {
            const files = await fs.readdir('outputs');
            const zipFiles = files.filter(file => file.endsWith('.zip'));

            const results: ProcessedFile[] = [];

            for (const file of zipFiles) {
                const jobId = this.extractJobIdFromFilename(file);
                const job = this.jobs.get(jobId);

                // Só inclui se o job pertence ao usuário
                if (job && job.userId === userId) {
                    const filePath = path.join('outputs', file);
                    const stats = await fs.stat(filePath);

                    results.push(new ProcessedFile(
                        file,
                        stats.size,
                        stats.mtime,
                        `/download/${file}`
                    ));
                }
            }

            console.log(`📋 Listados ${results.length} arquivos para usuário ${userId}`);
            return results;
        } catch (error) {
            console.error('❌ Erro ao listar arquivos:', error.message);
            return [];
        }
    }

    private extractJobIdFromFilename(filename: string): string {
        const match = filename.match(/frames_(.+)\.zip$/);
        return match ? match[1] : '';
    }
}