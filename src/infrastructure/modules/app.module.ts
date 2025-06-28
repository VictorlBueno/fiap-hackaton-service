import {Module} from '@nestjs/common';
import {MulterModule} from '@nestjs/platform-express';
import {ServeStaticModule} from '@nestjs/serve-static';
import {join} from 'path';
import {VideoProcessingRepository} from "../repositories/video-processing.repository";
import {ListProcessedFilesUseCase} from "../../application/usecases/list-processed.usecase";
import {ProcessVideoUseCase} from "../../application/usecases/process-video.usecase";
import {VideoController} from "../controllers/video.controller";
import {FileValidationService} from "../../application/services/file-validation.service";
import {FfmpegService} from "../services/ffmeg.services";
import {ZipService} from "../services/zip.services";


@Module({
    imports: [
        MulterModule.register({
            dest: './uploads',
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'uploads'),
            serveRoot: '/uploads',
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'outputs'),
            serveRoot: '/outputs',
        }),
    ],
    controllers: [VideoController],
    providers: [
        ProcessVideoUseCase,
        ListProcessedFilesUseCase,
        FileValidationService,
        {
            provide: 'IVideoProcessingRepository',
            useClass: VideoProcessingRepository,
        },
        FfmpegService,
        ZipService,
    ],
})

export class AppModule {
}