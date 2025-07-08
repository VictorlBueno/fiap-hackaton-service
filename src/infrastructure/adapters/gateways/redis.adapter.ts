import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { JobRepositoryPort } from '../../../domain/ports/repositories/job-repository.port';
import { ProcessingJob, JobStatus } from '../../../domain/entities/processing-job.entity';

@Injectable()
export class RedisJobRepositoryAdapter implements JobRepositoryPort {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  async saveJob(job: ProcessingJob): Promise<void> {
    if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
      const key = this.getJobKey(job.id, job.userId);
      await this.redis.set(key, JSON.stringify(job));
      await this.redis.sadd(this.getUserJobsKey(job.userId), job.id);
    }
  }

  async findJobById(id: string, userId: string): Promise<ProcessingJob | null> {
    const key = this.getJobKey(id, userId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return this.deserializeJob(data);
  }

  async getAllJobsByUser(userId: string): Promise<ProcessingJob[]> {
    const jobIds = await this.redis.smembers(this.getUserJobsKey(userId));
    const jobs: ProcessingJob[] = [];
    for (const id of jobIds) {
      const job = await this.findJobById(id, userId);
      if (job) jobs.push(job);
    }
    return jobs;
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    message: string,
    additionalData?: Partial<ProcessingJob>,
  ): Promise<void> {
    const job = await this.findJobById(id, additionalData?.userId || '');
    if (!job) return;
    job.status = status;
    job.message = message;
    if (additionalData) {
      Object.assign(job, additionalData);
    }
    await this.saveJob(job);
  }

  async updateJobVideoPath(id: string, videoPath: string): Promise<void> {}

  async removeJob(id: string, userId: string): Promise<void> {
    const key = this.getJobKey(id, userId);
    await this.redis.del(key);
    await this.redis.srem(this.getUserJobsKey(userId), id);
  }

  private getJobKey(id: string, userId: string): string {
    return `job:${userId}:${id}`;
  }

  private getUserJobsKey(userId: string): string {
    return `user:${userId}:jobs`;
  }

  private deserializeJob(data: string): ProcessingJob {
    const obj = JSON.parse(data);
    return new ProcessingJob(
      obj.id,
      obj.videoName,
      obj.status,
      obj.message,
      obj.userId,
      obj.frameCount,
      obj.zipPath,
      obj.createdAt ? new Date(obj.createdAt) : undefined,
      obj.updatedAt ? new Date(obj.updatedAt) : undefined,
    );
  }
} 