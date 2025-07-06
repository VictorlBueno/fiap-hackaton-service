import { Test, TestingModule } from '@nestjs/testing';
import { QueueProcessorAdapter } from '../../queue-processor.adapter';
import { QueuePort, QueueMessage } from '../../../../../domain/ports/gateways/queue.port';
import { VideoProcessingService } from '../../../../../domain/service/video-processing.service';
import { ProcessingJob, JobStatus } from '../../../../../domain/entities/processing-job.entity';

describe('QueueProcessorAdapter', () => {
  let adapter: QueueProcessorAdapter;
  let mockQueue: jest.Mocked<QueuePort>;
  let mockVideoProcessingService: jest.Mocked<VideoProcessingService>;

  const mockQueueMessage: QueueMessage = {
    id: 'job-123',
    videoPath: '/uploads/test-video.mp4',
    videoName: 'test-video.mp4',
    userId: 'user-456',
  };

  const mockProcessingJob = new ProcessingJob(
    'job-123',
    'test-video.mp4',
    JobStatus.COMPLETED,
    'Success',
    'user-456',
    150,
    'frames.zip',
    new Date(),
    new Date()
  );

  beforeEach(async () => {
    mockQueue = {
      consumeMessages: jest.fn(),
    } as any;

    mockVideoProcessingService = {
      processVideo: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueProcessorAdapter,
        {
          provide: 'QueuePort',
          useValue: mockQueue,
        },
        {
          provide: VideoProcessingService,
          useValue: mockVideoProcessingService,
        },
      ],
    }).compile();

    adapter = module.get<QueueProcessorAdapter>(QueueProcessorAdapter);
    jest.clearAllMocks();
  });

  it('should call consumeMessages on startProcessing', async () => {
    mockQueue.consumeMessages.mockResolvedValue();
    // @ts-ignore
    await adapter['startProcessing']();
    expect(mockQueue.consumeMessages).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should call processVideo on processMessage', async () => {
    mockVideoProcessingService.processVideo.mockResolvedValue({
      isFailed: () => false,
      isCompleted: () => true,
      id: 'job-123',
      videoName: 'test-video.mp4',
      status: JobStatus.COMPLETED,
      message: '',
      userId: 'user-456',
      createdAt: new Date(),
    });
    // @ts-ignore
    await adapter['processMessage'](mockQueueMessage);
    expect(mockVideoProcessingService.processVideo).toHaveBeenCalled();
  });

  it('should log error if processVideo throws', async () => {
    const error = new Error('fail');
    mockVideoProcessingService.processVideo.mockRejectedValue(error);
    const spy = jest.spyOn(console, 'error').mockImplementation();
    // @ts-ignore
    await expect(adapter['processMessage'](mockQueueMessage)).rejects.toThrow('fail');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  describe('Given QueueProcessorAdapter', () => {
    describe('When module initializes', () => {
      it('Then should call queue consumeMessages', async () => {
        mockQueue.consumeMessages.mockResolvedValue();

        await adapter.onModuleInit();
        
        // Aguardar o setTimeout
        await new Promise(resolve => setTimeout(resolve, 2100));

        expect(mockQueue.consumeMessages).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    describe('When processing message successfully', () => {
      let messageCallback: (message: QueueMessage) => Promise<void>;

      beforeEach(() => {
        mockQueue.consumeMessages.mockImplementation((callback) => {
          messageCallback = callback;
          return Promise.resolve();
        });

        mockVideoProcessingService.processVideo.mockResolvedValue(mockProcessingJob);
      });

      it('Then should create video entity and process successfully', async () => {
        await adapter.onModuleInit();
        
        // Aguardar o setTimeout
        await new Promise(resolve => setTimeout(resolve, 2100));

        await messageCallback(mockQueueMessage);

        expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockQueueMessage.id,
            originalName: mockQueueMessage.videoName,
            path: mockQueueMessage.videoPath,
            userId: mockQueueMessage.userId,
          }),
          mockQueueMessage.userId
        );
      });
    });

    describe('When processing message fails', () => {
      let messageCallback: (message: QueueMessage) => Promise<void>;
      const processingError = new Error('Processing failed');

      beforeEach(() => {
        mockQueue.consumeMessages.mockImplementation((callback) => {
          messageCallback = callback;
          return Promise.resolve();
        });

        mockVideoProcessingService.processVideo.mockRejectedValue(processingError);
      });

      it('Then should log error and re-throw exception', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await adapter.onModuleInit();
        
        // Aguardar o setTimeout
        await new Promise(resolve => setTimeout(resolve, 2100));

        await expect(messageCallback(mockQueueMessage)).rejects.toThrow('Processing failed');

        expect(consoleSpy).toHaveBeenCalledWith(
          `Erro crítico no processamento para usuário ${mockQueueMessage.userId}: ${mockQueueMessage.id}`,
          'Processing failed'
        );

        consoleSpy.mockRestore();
      });
    });

    describe('When processing returns failed job', () => {
      let messageCallback: (message: QueueMessage) => Promise<void>;
      const failedJob = new ProcessingJob(
        'job-123',
        'test-video.mp4',
        JobStatus.FAILED,
        'Processing failed',
        'user-456',
        0,
        undefined,
        new Date(),
        new Date()
      );

      beforeEach(() => {
        mockQueue.consumeMessages.mockImplementation((callback) => {
          messageCallback = callback;
          return Promise.resolve();
        });

        mockVideoProcessingService.processVideo.mockResolvedValue(failedJob);
      });

      it('Then should log failure message', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await adapter.onModuleInit();
        
        // Aguardar o setTimeout
        await new Promise(resolve => setTimeout(resolve, 2100));

        await messageCallback(mockQueueMessage);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Processamento falhou para usuário ${mockQueueMessage.userId}: ${mockQueueMessage.id} - ${failedJob.message}`
        );

        consoleSpy.mockRestore();
      });
    });
  });
}); 