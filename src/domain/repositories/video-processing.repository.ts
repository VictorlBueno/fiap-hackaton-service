import { ProcessingResult } from '../entities/processing-result.entity';

export interface IVideoProcessingRepository {
    saveProcessingResult(result: ProcessingResult): Promise<void>;
    getProcessedFiles(): Promise<any[]>;
}