import { Inject, Injectable } from '@nestjs/common';
import { ProcessingJob } from '../../domain/entities/processing-job.entity';
import { JobRepositoryPort } from '../../domain/ports/repositories/job-repository.port';

@Injectable()
export class ListAllJobsUseCase {
  constructor(
    @Inject('JobRepositoryPort')
    private readonly jobRepository: JobRepositoryPort,
  ) {}

  async execute(userId: string): Promise<ProcessingJob[]> {
    return this.jobRepository.getAllJobsByUser(userId);
  }
}
