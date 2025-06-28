import {Inject, Injectable} from '@nestjs/common';
import {IVideoProcessingRepository} from "../../domain/repositories/video-processing.repository";

@Injectable()
export class ListProcessedFilesUseCase {
    constructor(
        @Inject('IVideoProcessingRepository')
        private readonly videoRepository: IVideoProcessingRepository,
    ) {
    }

    async execute(): Promise<any[]> {
        return this.videoRepository.getProcessedFiles();
    }
}