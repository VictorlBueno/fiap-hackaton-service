import {Module} from '@nestjs/common';
import {MulterModule} from '@nestjs/platform-express';
import {ServeStaticModule} from '@nestjs/serve-static';
import {join} from 'path';
import {VideoController} from "../adapters/controllers/video.controller";
import {GetJobStatusUseCase} from "../../application/usecases/get-job-status.usecase";
import {UploadVideoUseCase} from "../../application/usecases/upload-video.usecase";
import {VideoProcessingService} from "../../domain/service/video-processing.service";
import {ListProcessedFilesUseCase} from "../../application/usecases/list-processed.usecase";
import {FfmpegVideoProcessorAdapter} from "../adapters/gateways/ffmpeg-video-processor.adapter";
import {RabbitMQQueueAdapter} from "../adapters/gateways/rabbitmq-queue.adapter";
import {FilesystemStorageAdapter} from "../adapters/gateways/filesystem-storage.adapter";
import {FileJobRepositoryAdapter} from "../adapters/repositories/file-job-repository.adapter";
import {QueueProcessorAdapter} from "../adapters/processors/queue-processor.adapter";

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

    controllers: [
        VideoController,
    ],

    providers: [
        UploadVideoUseCase,
        GetJobStatusUseCase,
        ListProcessedFilesUseCase,
        VideoProcessingService,
        {
            provide: 'VideoProcessorPort',
            useClass: FfmpegVideoProcessorAdapter,
        },
        {
            provide: 'QueuePort',
            useClass: RabbitMQQueueAdapter,
        },
        {
            provide: 'FileStoragePort',
            useClass: FilesystemStorageAdapter,
        },
        {
            provide: 'JobRepositoryPort',
            useClass: FileJobRepositoryAdapter,
        },

        FfmpegVideoProcessorAdapter,
        RabbitMQQueueAdapter,
        FilesystemStorageAdapter,
        FileJobRepositoryAdapter,
        QueueProcessorAdapter,
    ],
})

export class AppModule {
    constructor() {
        console.log('🏗️ AppModule inicializado com Arquitetura Hexagonal');
    }
}