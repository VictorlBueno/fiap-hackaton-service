import {Module} from '@nestjs/common';
import {MulterModule} from '@nestjs/platform-express';
import {ServeStaticModule} from '@nestjs/serve-static';
import {join} from 'path';
import {ProcessVideoUseCase} from "../../application/usecases/process-video.usecase";
import {VideoController} from "../controllers/video.controller";
import {QueueVideoUseCase} from "../../application/usecases/queue-video.usecase";
import {GetJobStatusUseCase} from "../../application/usecases/get-job-status.usecase";
import {ListProcessedFilesUseCase} from "../../application/usecases/list-processed.usecase";
import {FileValidationService} from "../../application/services/file-validation.service";
import {VideoProcessingRepository} from "../repositories/video-processing.repository";
import {FfmpegService} from "../services/ffmeg.services";
import {ZipService} from "../services/zip.services";
import {VideoQueueProcessorService} from "../services/video-queue-processor.service";
import {RabbitMQService} from "../services/rabbitmq.service";


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
        QueueVideoUseCase,
        GetJobStatusUseCase,
        ListProcessedFilesUseCase,
        FileValidationService,
        {
            provide: 'IVideoProcessingRepository',
            useClass: VideoProcessingRepository,
        },
        FfmpegService,
        ZipService,
        RabbitMQService,
        VideoQueueProcessorService,
    ],
})

export class AppModule {
}