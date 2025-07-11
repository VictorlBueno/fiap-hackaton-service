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
    console.log(`💾 Salvando job: ${job.id} - ${job.status} (usuário: ${job.userId})`);
    
    if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
      console.log(`📝 Salvando job no Redis: ${job.id}`);
      await this.redisRepo.saveJob(job);
    } else {
      console.log(`📝 Salvando job no PostgreSQL: ${job.id}`);
      await this.postgresRepo.saveJob(job);
    }
  }

  async findJobById(id: string, userId: string): Promise<ProcessingJob | null> {
    console.log(`🔍 Buscando job: ${id} (usuário: ${userId})`);
    
    const redisJob = await this.redisRepo.findJobById(id, userId);
    if (redisJob) {
      console.log(`✅ Job encontrado no Redis: ${id} - ${redisJob.status}`);
      return redisJob;
    }
    
    console.log(`🔍 Job não encontrado no Redis, buscando no PostgreSQL: ${id}`);
    const postgresJob = await this.postgresRepo.findJobById(id, userId);
    if (postgresJob) {
      console.log(`✅ Job encontrado no PostgreSQL: ${id} - ${postgresJob.status}`);
    } else {
      console.log(`❌ Job não encontrado em nenhum repositório: ${id}`);
    }
    
    return postgresJob;
  }

  async getAllJobsByUser(userId: string): Promise<ProcessingJob[]> {
    const redisJobs = await this.redisRepo.getAllJobsByUser(userId);
    const postgresJobs = await this.postgresRepo.getAllJobsByUser(userId);
    
    console.log(`🔍 Redis jobs: ${redisJobs.length}, PostgreSQL jobs: ${postgresJobs.length} para usuário ${userId}`);
    
    const jobMap = new Map<string, ProcessingJob>();
    
    postgresJobs.forEach(job => {
      jobMap.set(job.id, job);
      console.log(`📊 Job do PostgreSQL: ${job.id} - ${job.status}`);
    });
    
    redisJobs.forEach(job => {
      if (!jobMap.has(job.id)) {
        jobMap.set(job.id, job);
        console.log(`📊 Job do Redis: ${job.id} - ${job.status}`);
      } else {
        console.log(`⚠️ Job duplicado encontrado: ${job.id} - Redis: ${job.status}, PostgreSQL: ${jobMap.get(job.id)?.status}`);
      }
    });
    
    const result = Array.from(jobMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`✅ Total de jobs retornados: ${result.length} para usuário ${userId}`);
    return result;
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    message: string,
    additionalData?: Partial<ProcessingJob>,
  ): Promise<void> {
    console.log(`🔄 Atualizando status: ${id} -> ${status} (userId: ${additionalData?.userId})`);
    
    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      const userId = additionalData?.userId || '';
      const job = await this.redisRepo.findJobById(id, userId);
      
      if (job) {
        console.log(`📝 Job encontrado no Redis: ${id} - ${job.status} -> ${status}`);
        job.status = status;
        job.message = message;
        if (additionalData) {
          Object.assign(job, additionalData);
        }
        await this.postgresRepo.saveJob(job);
        console.log(`💾 Job salvo no PostgreSQL: ${id}`);
        
        if (typeof (this.redisRepo as any).removeJob === 'function') {
          await (this.redisRepo as any).removeJob(id, userId);
          console.log(`🗑️ Job removido do Redis: ${id}`);
        } else {
          console.warn(`⚠️ Método removeJob não encontrado no Redis adapter`);
        }
      } else {
        console.log(`📝 Job não encontrado no Redis, atualizando diretamente no PostgreSQL: ${id}`);
        await this.postgresRepo.updateJobStatus(id, status, message, additionalData);
      }
    } else {
      console.log(`📝 Atualizando job no Redis: ${id} -> ${status}`);
      await this.redisRepo.updateJobStatus(id, status, message, additionalData);
    }
  }

  async updateJobVideoPath(id: string, videoPath: string): Promise<void> {
    await this.redisRepo.updateJobVideoPath(id, videoPath);
    await this.postgresRepo.updateJobVideoPath(id, videoPath);
  }
} 