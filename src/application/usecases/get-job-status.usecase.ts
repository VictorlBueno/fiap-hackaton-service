import { Injectable } from '@nestjs/common';
import { ProcessingJob, ProcessingStatus } from '../../domain/entities/processing-status.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class GetJobStatusUseCase {
    async execute(jobId: string): Promise<ProcessingJob | null> {
        try {
            // Verifica se existe arquivo ZIP gerado
            const zipPath = path.join('outputs', `frames_${jobId}.zip`);

            try {
                await fs.access(zipPath);
                // ZIP existe = processamento concluído
                return new ProcessingJob(
                    jobId,
                    'video.mp4', // Nome genérico, pode ser melhorado salvando no banco
                    ProcessingStatus.COMPLETED,
                    'Processamento concluído! Arquivo ZIP disponível para download.'
                );
            } catch {
                // ZIP não existe = ainda processando ou falhou

                // Verifica se arquivo de vídeo ainda existe (ainda não processado)
                const uploadsFiles = await fs.readdir('uploads');
                const videoExists = uploadsFiles.some(file => file.includes(jobId));

                if (videoExists) {
                    return new ProcessingJob(
                        jobId,
                        'video.mp4',
                        ProcessingStatus.PROCESSING,
                        'Vídeo sendo processado...'
                    );
                } else {
                    return new ProcessingJob(
                        jobId,
                        'video.mp4',
                        ProcessingStatus.FAILED,
                        'Processamento falhou ou job não encontrado.'
                    );
                }
            }
        } catch (error) {
            return null;
        }
    }
}