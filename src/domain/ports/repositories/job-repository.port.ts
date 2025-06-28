import {ProcessingJob} from "../../entities/processing-job.entity";
import {ProcessedFile} from "../../entities/processed-file.entity";

export interface JobRepositoryPort {
    saveJob(job: ProcessingJob): Promise<void>;
    findJobById(id: string, userId: string): Promise<ProcessingJob | null>;
    getProcessedFilesByUser(userId: string): Promise<ProcessedFile[]>;
}