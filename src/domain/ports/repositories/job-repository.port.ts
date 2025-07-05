import { JobStatus, ProcessingJob } from '../../entities/processing-job.entity';
import { ProcessedFile } from '../../entities/processed-file.entity';

export interface JobRepositoryPort {
  saveJob(job: ProcessingJob): Promise<void>;

  findJobById(id: string, userId: string): Promise<ProcessingJob | null>;

  getProcessedFilesByUser(userId: string): Promise<ProcessedFile[]>;

  getAllJobsByUser(userId: string): Promise<ProcessingJob[]>;
  updateJobStatus(
    id: string,
    status: JobStatus,
    message: string,
    additionalData?: Partial<ProcessingJob>,
  ): Promise<void>;

  updateJobVideoPath(id: string, videoPath: string): Promise<void>;
}
