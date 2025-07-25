import {MiddlewareConsumer, Module, RequestMethod} from '@nestjs/common';
import {MulterModule} from '@nestjs/platform-express';
import {ServeStaticModule} from '@nestjs/serve-static';
import {join} from 'path';
import {VideoController} from "../adapters/controllers/video.controller";
import {MetricsController} from "../adapters/controllers/metrics.controller";
import {GetJobStatusUseCase} from "../../application/usecases/get-job-status.usecase";
import {UploadVideoUseCase} from "../../application/usecases/upload-video.usecase";
import {VideoProcessingService} from "../../domain/service/video-processing.service";
import {FfmpegVideoProcessorAdapter} from "../adapters/gateways/ffmpeg-video-processor.adapter";
import {RabbitMQQueueAdapter} from "../adapters/gateways/rabbitmq-queue.adapter";
import {S3StorageAdapter} from "../adapters/gateways/s3-storage.adapter";
import {
    PostgresJobRepositoryAdapter
} from "../adapters/repositories/file-job-repository.adapter";
import {QueueProcessorAdapter} from "../adapters/processors/queue-processor.adapter";
import {JwtAuthMiddleware} from "../middleware/jwt-auth.middleware";
import {ListAllJobsUseCase} from "../../application/usecases/list-all-job-usecase";
import {EmailNotificationService} from "../../domain/service/email-notification.service";
import {GmailEmailProviderAdapter} from "../adapters/gateways/gmail-email-provider.adapter";
import {AuthServiceAdapter} from "../adapters/gateways/auth-service.adapter";
import { RedisJobRepositoryAdapter } from "../adapters/gateways/redis.adapter";
import { CompositeJobRepositoryAdapter } from "../adapters/gateways/composite-job-repository.adapter";
import { MetricsService } from "../adapters/services/metrics.service";

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
        MetricsController,
    ],

    providers: [
        UploadVideoUseCase,
        GetJobStatusUseCase,
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
            useClass: S3StorageAdapter,
        },
        {
            provide: 'JobRepositoryPort',
            useClass: CompositeJobRepositoryAdapter,
        },
        {
            provide: 'RedisJobRepositoryAdapter',
            useClass: RedisJobRepositoryAdapter,
        },
        {
            provide: 'PostgresJobRepositoryAdapter',
            useClass: PostgresJobRepositoryAdapter,
        },
        PostgresJobRepositoryAdapter,
        FfmpegVideoProcessorAdapter,
        RabbitMQQueueAdapter,
        ListAllJobsUseCase,
        S3StorageAdapter,
        QueueProcessorAdapter,
        EmailNotificationService,
        AuthServiceAdapter,
        {
            provide: 'EmailProviderPort',
            useClass: GmailEmailProviderAdapter,
        },
        GmailEmailProviderAdapter,
        MetricsService,
    ],
})

export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(JwtAuthMiddleware)
            .forRoutes(
                {path: 'upload', method: RequestMethod.POST},
                {path: 'api/job/*', method: RequestMethod.GET},
                {path: 'api/status', method: RequestMethod.GET},
                {path: 'download/*', method: RequestMethod.GET},
            );
    }
}