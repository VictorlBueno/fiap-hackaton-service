import { JobStatus, ProcessingJob } from '../../entities/processing-job.entity';

export interface JobRepositoryPort {
  saveJob(job: ProcessingJob): Promise<void>;

  findJobById(id: string, userId: string): Promise<ProcessingJob | null>;

  getAllJobsByUser(userId: string): Promise<ProcessingJob[]>;
  updateJobStatus(
    id: string,
    status: JobStatus,
    message: string,
    additionalData?: Partial<ProcessingJob>,
  ): Promise<void>;

  updateJobVideoPath(id: string, videoPath: string): Promise<void>;
}
