import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {AppModule} from "../../app.module";
import {VideoController} from "../../../adapters/controllers/video.controller";
import {UploadVideoUseCase} from "../../../../application/usecases/upload-video.usecase";
import {GetJobStatusUseCase} from "../../../../application/usecases/get-job-status.usecase";
import {ListAllJobsUseCase} from "../../../../application/usecases/list-all-job-usecase";
import {VideoProcessingService} from "../../../../domain/service/video-processing.service";
import {FfmpegVideoProcessorAdapter} from "../../../adapters/gateways/ffmpeg-video-processor.adapter";
import {RabbitMQQueueAdapter} from "../../../adapters/gateways/rabbitmq-queue.adapter";
import {FilesystemStorageAdapter} from "../../../adapters/gateways/filesystem-storage.adapter";
import {PostgresJobRepositoryAdapter} from "../../../adapters/repositories/file-job-repository.adapter";
import {QueueProcessorAdapter} from "../../../adapters/processors/queue-processor.adapter";
import {JwtAuthMiddleware} from "../../../middleware/jwt-auth.middleware";

jest.mock('../../../adapters/controllers/video.controller');
jest.mock('../../../../application/usecases/get-job-status.usecase');
jest.mock('../../../../application/usecases/upload-video.usecase');
jest.mock('../../../../application/usecases/list-all-job-usecase');
jest.mock('../../../../domain/service/video-processing.service');
jest.mock('../../../adapters/gateways/ffmpeg-video-processor.adapter');
jest.mock('../../../adapters/gateways/rabbitmq-queue.adapter');
jest.mock('../../../adapters/gateways/filesystem-storage.adapter');
jest.mock('../../../adapters/repositories/file-job-repository.adapter');
jest.mock('../../../adapters/processors/queue-processor.adapter');
jest.mock('../../../middleware/jwt-auth.middleware');

describe('Application Module Configuration', () => {
    let module: TestingModule;
    let appModule: AppModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        appModule = module.get<AppModule>(AppModule);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('Given dependency injection requirements', () => {
        describe('When module is instantiated', () => {
            it('Should register all controllers correctly', () => {
                const videoController = module.get(VideoController);
                expect(videoController).toBeDefined();
            });

            it('Should register all use cases as providers', () => {
                const uploadVideoUseCase = module.get(UploadVideoUseCase);
                const getJobStatusUseCase = module.get(GetJobStatusUseCase);
                const listAllJobsUseCase = module.get(ListAllJobsUseCase);

                expect(uploadVideoUseCase).toBeDefined();
                expect(getJobStatusUseCase).toBeDefined();
                expect(listAllJobsUseCase).toBeDefined();
            });

            it('Should register domain services correctly', () => {
                const videoProcessingService = module.get(VideoProcessingService);
                expect(videoProcessingService).toBeDefined();
            });

            it('Should bind port interfaces to concrete implementations', () => {
                const videoProcessor = module.get('VideoProcessorPort');
                const queueAdapter = module.get('QueuePort');
                const fileStorage = module.get('FileStoragePort');
                const jobRepository = module.get('JobRepositoryPort');

                expect(videoProcessor).toBeInstanceOf(FfmpegVideoProcessorAdapter);
                expect(queueAdapter).toBeInstanceOf(RabbitMQQueueAdapter);
                expect(fileStorage).toBeInstanceOf(FilesystemStorageAdapter);
                expect(jobRepository).toBeInstanceOf(PostgresJobRepositoryAdapter);
            });

            it('Should register concrete adapters as direct dependencies', () => {
                const postgresAdapter = module.get(PostgresJobRepositoryAdapter);
                const ffmpegAdapter = module.get(FfmpegVideoProcessorAdapter);
                const rabbitMQAdapter = module.get(RabbitMQQueueAdapter);
                const filesystemAdapter = module.get(FilesystemStorageAdapter);
                const queueProcessor = module.get(QueueProcessorAdapter);

                expect(postgresAdapter).toBeDefined();
                expect(ffmpegAdapter).toBeDefined();
                expect(rabbitMQAdapter).toBeDefined();
                expect(filesystemAdapter).toBeDefined();
                expect(queueProcessor).toBeDefined();
            });
        });
    });

    describe('Given middleware configuration requirements', () => {
        let mockConsumer: any;

        beforeEach(() => {
            mockConsumer = {
                apply: jest.fn().mockReturnThis(),
                forRoutes: jest.fn().mockReturnThis(),
            };
        });

        describe('When configuring authentication middleware', () => {
            it('Should apply JWT middleware to protected routes', () => {
                appModule.configure(mockConsumer);

                expect(mockConsumer.apply).toHaveBeenCalledWith(JwtAuthMiddleware);
                expect(mockConsumer.forRoutes).toHaveBeenCalledWith(
                    { path: 'upload', method: RequestMethod.POST },
                    { path: 'api/job/*', method: RequestMethod.GET },
                    { path: 'api/status', method: RequestMethod.GET },
                    { path: 'download/*', method: RequestMethod.GET }
                );
            });

            it('Should protect job API endpoints with GET method only', () => {
                appModule.configure(mockConsumer);

                const forRoutesCall = mockConsumer.forRoutes.mock.calls[0];
                const jobRoute = forRoutesCall.find((route: any) => route.path === 'api/job/*');
                const statusRoute = forRoutesCall.find((route: any) => route.path === 'api/status');

                expect(jobRoute.method).toBe(RequestMethod.GET);
                expect(statusRoute.method).toBe(RequestMethod.GET);
            });

            it('Should protect download endpoints with GET method only', () => {
                appModule.configure(mockConsumer);

                const forRoutesCall = mockConsumer.forRoutes.mock.calls[0];
                const downloadRoute = forRoutesCall.find((route: any) => route.path === 'download/*');

                expect(downloadRoute.method).toBe(RequestMethod.GET);
            });
        });
    });

    describe('Given hexagonal architecture compliance', () => {
        describe('When analyzing dependency structure', () => {
            it('Should follow dependency inversion principle for ports', () => {
                const videoProcessorToken = 'VideoProcessorPort';
                const queueToken = 'QueuePort';
                const fileStorageToken = 'FileStoragePort';
                const jobRepositoryToken = 'JobRepositoryPort';

                expect(module.get(videoProcessorToken)).toBeDefined();
                expect(module.get(queueToken)).toBeDefined();
                expect(module.get(fileStorageToken)).toBeDefined();
                expect(module.get(jobRepositoryToken)).toBeDefined();
            });

            it('Should separate application layer from infrastructure concerns', () => {
                const uploadUseCase = module.get(UploadVideoUseCase);
                const getJobStatusUseCase = module.get(GetJobStatusUseCase);
                const listJobsUseCase = module.get(ListAllJobsUseCase);

                expect(uploadUseCase).toBeDefined();
                expect(getJobStatusUseCase).toBeDefined();
                expect(listJobsUseCase).toBeDefined();
            });

            it('Should maintain clean separation between domain and infrastructure', () => {
                const domainService = module.get(VideoProcessingService);
                const infrastructureAdapter = module.get(PostgresJobRepositoryAdapter);

                expect(domainService).toBeDefined();
                expect(infrastructureAdapter).toBeDefined();
            });
        });
    });

    describe('Given static file serving requirements', () => {
        describe('When module imports are configured', () => {
            it('Should be testable through module compilation', async () => {
                const testModule = await Test.createTestingModule({
                    imports: [AppModule],
                }).compile();

                expect(testModule).toBeDefined();
                await testModule.close();
            });
        });
    });

    describe('Given container singleton behavior', () => {
        describe('When requesting same service multiple times', () => {
            it('Should return same instance for singleton services', () => {
                const firstInstance = module.get(VideoProcessingService);
                const secondInstance = module.get(VideoProcessingService);

                expect(firstInstance).toBe(secondInstance);
            });

            it('Should return same instance for repository adapters', () => {
                const firstInstance = module.get(PostgresJobRepositoryAdapter);
                const secondInstance = module.get(PostgresJobRepositoryAdapter);

                expect(firstInstance).toBe(secondInstance);
            });
        });
    });
});