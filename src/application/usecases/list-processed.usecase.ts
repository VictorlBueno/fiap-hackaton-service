import { Injectable, Inject } from '@nestjs/common';
import { ProcessedFile } from '../../domain/entities/processed-file.entity';
import { JobRepositoryPort } from '../../domain/ports/repositories/job-repository.port';

@Injectable()
export class ListProcessedFilesUseCase {
    constructor(
        @Inject('JobRepositoryPort') private readonly jobRepository: JobRepositoryPort,
    ) {}

    async execute(userId: string): Promise<ProcessedFile[]> {
        return this.jobRepository.getProcessedFilesByUser(userId);
    }
}