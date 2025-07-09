import { Injectable, Inject } from '@nestjs/common';
import { JobRepositoryPort } from '../../../domain/ports/repositories/job-repository.port';
import { ProcessingJob, JobStatus } from '../../../domain/entities/processing-job.entity';

@Injectable()
export class CompositeJobRepositoryAdapter implements JobRepositoryPort {
  constructor(
    @Inject('RedisJobRepositoryAdapter') private readonly redisRepo: JobRepositoryPort,
    @Inject('PostgresJobRepositoryAdapter') private readonly postgresRepo: JobRepositoryPort,
  ) {}

  async saveJob(job: ProcessingJob): Promise<void> {
    if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
      await this.redisRepo.saveJob(job);
    } else {
      await this.postgresRepo.saveJob(job);
    }
  }

  async findJobById(id: string, userId: string): Promise<ProcessingJob | null> {
    const redisJob = await this.redisRepo.findJobById(id, userId);
    if (redisJob) return redisJob;
    return this.postgresRepo.findJobById(id, userId);
  }

  async getAllJobsByUser(userId: string): Promise<ProcessingJob[]> {
    const redisJobs = await this.redisRepo.getAllJobsByUser(userId);
    const postgresJobs = await this.postgresRepo.getAllJobsByUser(userId);
    return [...redisJobs, ...postgresJobs];
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    message: string,
    additionalData?: Partial<ProcessingJob>,
  ): Promise<void> {
    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      const userId = additionalData?.userId || '';
      const job = await this.redisRepo.findJobById(id, userId);
      if (job) {
        job.status = status;
        job.message = message;
        if (additionalData) {
          Object.assign(job, additionalData);
        }
        await this.postgresRepo.saveJob(job);
        if (typeof (this.redisRepo as any).removeJob === 'function') {
          await (this.redisRepo as any).removeJob(id, userId);
        }
      } else {
        await this.postgresRepo.updateJobStatus(id, status, message, additionalData);
      }
    } else {
      await this.redisRepo.updateJobStatus(id, status, message, additionalData);
    }
  }

  async updateJobVideoPath(id: string, videoPath: string): Promise<void> {
    await this.redisRepo.updateJobVideoPath(id, videoPath);
    await this.postgresRepo.updateJobVideoPath(id, videoPath);
  }
} 