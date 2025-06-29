import { Test, TestingModule } from '@nestjs/testing';
import {QueueProcessorAdapter} from "../../queue-processor.adapter";
import {QueueMessage, QueuePort} from "../../../../../domain/ports/gateways/queue.port";
import {VideoProcessingService} from "../../../../../domain/service/video-processing.service";
import {JobStatus, ProcessingJob} from "../../../../../domain/entities/processing-job.entity";
import {Video} from "../../../../../domain/entities/video.entity";

describe('QueueProcessorAdapter', () => {
    let adapter: QueueProcessorAdapter;
    let mockQueue: jest.Mocked<QueuePort>;
    let mockVideoProcessingService: jest.Mocked<VideoProcessingService>;

    const createMockQueueMessage = (): QueueMessage => ({
        id: 'video-123',
        videoName: 'test-video.mp4',
        videoPath: '/uploads/test-video.mp4',
        userId: 'user-456'
    });

    const createMockProcessingJob = (status: JobStatus): ProcessingJob => ({
        id: 'video-123',
        userId: 'user-456',
        status,
        message: status === JobStatus.COMPLETED ? 'Processamento concluído' : 'Erro no processamento',
        isCompleted: () => status === JobStatus.COMPLETED,
        isFailed: () => status === JobStatus.FAILED
    } as ProcessingJob);

    beforeEach(async () => {
        jest.useFakeTimers();
        jest.spyOn(global, 'setTimeout');

        const mockQueuePort = {
            consumeMessages: jest.fn(),
            sendMessage: jest.fn()
        };

        const mockVideoService = {
            processVideo: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QueueProcessorAdapter,
                {
                    provide: 'QueuePort',
                    useValue: mockQueuePort
                },
                {
                    provide: VideoProcessingService,
                    useValue: mockVideoService
                }
            ]
        }).compile();

        adapter = module.get<QueueProcessorAdapter>(QueueProcessorAdapter);
        mockQueue = module.get('QueuePort');
        mockVideoProcessingService = module.get(VideoProcessingService);

        // Mock console methods to avoid noise in tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('GIVEN queue processor initialization', () => {
        describe('WHEN module initializes', () => {
            it('THEN should start queue processing after delay', async () => {
                mockQueue.consumeMessages.mockResolvedValue();

                await adapter.onModuleInit();

                expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);

                jest.runAllTimers();
                await Promise.resolve();

                expect(mockQueue.consumeMessages).toHaveBeenCalledWith(
                    expect.any(Function)
                );
            });

            it('THEN should retry on queue initialization failure', async () => {
                mockQueue.consumeMessages
                    .mockRejectedValueOnce(new Error('Queue connection failed'))
                    .mockResolvedValueOnce();

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                expect(console.error).toHaveBeenCalledWith(
                    'Erro no processador:',
                    'Queue connection failed'
                );

                jest.runAllTimers();
                await Promise.resolve();

                expect(mockQueue.consumeMessages).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('GIVEN message processing', () => {
        describe('WHEN processing a valid message', () => {
            it('THEN should create video entity and process successfully', async () => {
                const message = createMockQueueMessage();
                const completedJob = createMockProcessingJob(JobStatus.COMPLETED);
                let messageCallback: (message: QueueMessage) => Promise<void>;

                mockQueue.consumeMessages.mockImplementation(async (callback) => {
                    messageCallback = callback;
                });

                mockVideoProcessingService.processVideo.mockResolvedValue(completedJob);

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                await messageCallback!(message);

                expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: message.id,
                        originalName: message.videoName,
                        path: message.videoPath,
                        userId: message.userId,
                        size: 0
                    })
                );

                expect(console.log).toHaveBeenCalledWith(
                    `Processamento concluído para usuário ${message.userId}: ${message.id}`
                );
            });

            it('THEN should handle failed processing gracefully', async () => {
                const message = createMockQueueMessage();
                const failedJob = createMockProcessingJob(JobStatus.FAILED);
                let messageCallback: (message: QueueMessage) => Promise<void>;

                mockQueue.consumeMessages.mockImplementation(async (callback) => {
                    messageCallback = callback;
                });

                mockVideoProcessingService.processVideo.mockResolvedValue(failedJob);

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                await messageCallback!(message);

                expect(console.error).toHaveBeenCalledWith(
                    `Processamento falhou para usuário ${message.userId}: ${message.id} - ${failedJob.message}`
                );
            });

            it('THEN should create video entity with current timestamp', async () => {
                const message = createMockQueueMessage();
                const beforeTime = Date.now();
                let messageCallback: (message: QueueMessage) => Promise<void>;

                mockQueue.consumeMessages.mockImplementation(async (callback) => {
                    messageCallback = callback;
                });

                mockVideoProcessingService.processVideo.mockResolvedValue(
                    createMockProcessingJob(JobStatus.COMPLETED)
                );

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                await messageCallback!(message);

                const videoArgument = mockVideoProcessingService.processVideo.mock.calls[0][0] as Video;
                const afterTime = Date.now();

                expect(videoArgument.createdAt).toBeInstanceOf(Date);
                expect(videoArgument.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
                expect(videoArgument.createdAt.getTime()).toBeLessThanOrEqual(afterTime);
            });
        });

        describe('WHEN processing fails with exception', () => {
            it('THEN should log error and re-throw exception', async () => {
                const message = createMockQueueMessage();
                const error = new Error('Database connection failed');
                let messageCallback: (message: QueueMessage) => Promise<void>;

                mockQueue.consumeMessages.mockImplementation(async (callback) => {
                    messageCallback = callback;
                });

                mockVideoProcessingService.processVideo.mockRejectedValue(error);

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                await expect(messageCallback!(message)).rejects.toThrow(
                    'Database connection failed'
                );

                expect(console.error).toHaveBeenCalledWith(
                    `Erro crítico no processamento para usuário ${message.userId}: ${message.id}`,
                    'Database connection failed'
                );
            });

            it('THEN should handle null processing result', async () => {
                const message = createMockQueueMessage();
                let messageCallback: (message: QueueMessage) => Promise<void>;

                mockQueue.consumeMessages.mockImplementation(async (callback) => {
                    messageCallback = callback;
                });

                mockVideoProcessingService.processVideo.mockResolvedValue(null);

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                await messageCallback!(message);

                // Should not log completion or failure messages
                expect(console.log).not.toHaveBeenCalledWith(
                    expect.stringContaining('✅ Processamento concluído')
                );
                expect(console.error).not.toHaveBeenCalledWith(
                    expect.stringContaining('❌ Processamento falhou')
                );
            });
        });

        describe('WHEN processing different message types', () => {
            it('THEN should handle messages with special characters in video name', async () => {
                const message: QueueMessage = {
                    ...createMockQueueMessage(),
                    videoName: 'vídeo-teste_ção.mp4',
                    videoPath: '/uploads/vídeo-teste_ção.mp4'
                };
                let messageCallback: (message: QueueMessage) => Promise<void>;

                mockQueue.consumeMessages.mockImplementation(async (callback) => {
                    messageCallback = callback;
                });

                mockVideoProcessingService.processVideo.mockResolvedValue(
                    createMockProcessingJob(JobStatus.COMPLETED)
                );

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                await messageCallback!(message);

                expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(
                    expect.objectContaining({
                        originalName: 'vídeo-teste_ção.mp4',
                        path: '/uploads/vídeo-teste_ção.mp4'
                    })
                );
            });

            it('THEN should handle long user IDs and video names', async () => {
                const message: QueueMessage = {
                    ...createMockQueueMessage(),
                    userId: 'a'.repeat(100),
                    videoName: 'b'.repeat(255) + '.mp4'
                };
                let messageCallback: (message: QueueMessage) => Promise<void>;

                mockQueue.consumeMessages.mockImplementation(async (callback) => {
                    messageCallback = callback;
                });

                mockVideoProcessingService.processVideo.mockResolvedValue(
                    createMockProcessingJob(JobStatus.COMPLETED)
                );

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                await messageCallback!(message);

                expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(
                    expect.objectContaining({
                        userId: message.userId,
                        originalName: message.videoName
                    })
                );
            });
        });
    });

    describe('GIVEN error scenarios', () => {
        describe('WHEN queue consumption fails during runtime', () => {
            it('THEN should attempt retry after delay', async () => {

                mockQueue.consumeMessages
                    .mockRejectedValueOnce(new Error('Connection lost'))
                    .mockResolvedValueOnce();

                await adapter.onModuleInit();
                jest.runAllTimers();
                await Promise.resolve();

                expect(console.error).toHaveBeenCalledWith(
                    'Erro no processador:',
                    'Connection lost'
                );

                jest.runAllTimers();
                await Promise.resolve();

                expect(mockQueue.consumeMessages).toHaveBeenCalledTimes(2);
            });
        });
    });
});