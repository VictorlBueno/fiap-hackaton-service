import { Injectable, Inject } from '@nestjs/common';
import { ProcessingJob } from '../../domain/entities/processing-job.entity';
import { JobRepositoryPort } from '../../domain/ports/repositories/job-repository.port';

@Injectable()
export class GetJobStatusUseCase {
    constructor(
        @Inject('JobRepositoryPort') private readonly jobRepository: JobRepositoryPort,
    ) {}

    async execute(jobId: string): Promise<ProcessingJob | null> {
        return this.jobRepository.findJobById(jobId);
    }
}