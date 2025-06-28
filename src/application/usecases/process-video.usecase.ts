import { Injectable, Inject } from '@nestjs/common';
import { ProcessingResult } from '../../domain/entities/processing-result.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import {IVideoProcessingRepository} from "../../domain/repositories/video-processing.repository";
import {FfmpegService} from "../../infrastructure/services/ffmeg.services";
import {ZipService} from "../../infrastructure/services/zip.services";

@Injectable()
export class ProcessVideoUseCase {
    constructor(
        @Inject('IVideoProcessingRepository')
        private readonly videoRepository: IVideoProcessingRepository,
        private readonly ffmpegService: FfmpegService,
        private readonly zipService: ZipService,
    ) {}

    async execute(videoPath: string, timestamp: string): Promise<ProcessingResult> {
        console.log(`Iniciando processamento: ${videoPath}`);

        const tempDir = path.join('temp', timestamp);
        await fs.mkdir(tempDir, { recursive: true });

        try {
            const frames = await this.ffmpegService.extractFrames(videoPath, tempDir);

            if (frames.length === 0) {
                return new ProcessingResult(false, 'Nenhum frame foi extraído do vídeo');
            }

            console.log(`📸 Extraídos ${frames.length} frames`);

            const zipFilename = `frames_${timestamp}.zip`;
            const zipPath = path.join('outputs', zipFilename);

            await this.zipService.createZipFile(frames, zipPath);
            console.log(`✅ ZIP criado: ${zipPath}`);

            const imageNames = frames.map(frame => path.basename(frame));

            const result = new ProcessingResult(
                true,
                `Processamento concluído! ${frames.length} frames extraídos.`,
                zipFilename,
                frames.length,
                imageNames,
            );

            await this.videoRepository.saveProcessingResult(result);
            return result;

        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
}