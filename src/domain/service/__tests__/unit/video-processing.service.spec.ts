import { Test, TestingModule } from '@nestjs/testing';
import { VideoProcessingService } from '../../video-processing.service';
import { Video } from '../../../entities/video.entity';
import { ProcessingJob, JobStatus } from '../../../entities/processing-job.entity';
import { EmailNotificationService } from '../../email-notification.service';

describe('Serviço de Processamento de Vídeo', () => {
  let service: VideoProcessingService;
  let mockVideoProcessor: any;
  let mockFileStorage: any;
  let mockJobRepository: any;
  let mockEmailNotificationService: any;
  let mockMetricsService: any;

  const mockVideo = new Video(
    'job-123',
    'test-video.mp4',
    '/uploads/test-video.mp4',
    1024,
    'user-456',
    new Date()
  );

  const mockCompletedJob = new ProcessingJob(
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
    mockVideoProcessor = {
      extractFrames: jest.fn(),
    };

    mockFileStorage = {
      uploadFile: jest.fn(),
      createZip: jest.fn(),
      getSignedDownloadUrl: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      downloadFile: jest.fn(),
    };

    mockJobRepository = {
      updateJobStatus: jest.fn(),
      findJobById: jest.fn(),
      updateJobVideoPath: jest.fn(),
    };

    mockEmailNotificationService = {
      notifyVideoProcessingComplete: jest.fn(),
    };

    mockMetricsService = {
      recordVideoProcessingDuration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProcessingService,
        {
          provide: 'VideoProcessorPort',
          useValue: mockVideoProcessor,
        },
        {
          provide: 'FileStoragePort',
          useValue: mockFileStorage,
        },
        {
          provide: 'JobRepositoryPort',
          useValue: mockJobRepository,
        },
        {
          provide: EmailNotificationService,
          useValue: mockEmailNotificationService,
        },
        {
          provide: 'MetricsService',
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<VideoProcessingService>(VideoProcessingService);
    jest.clearAllMocks();
  });

  describe('Dado o VideoProcessingService', () => {
    describe('Quando processando vídeo com sucesso', () => {
      const mockFrameFiles = ['/temp/frame1.png', '/temp/frame2.png', '/temp/frame3.png'];

      beforeEach(() => {
        mockFileStorage.fileExists.mockResolvedValue(true);
        mockFileStorage.downloadFile.mockResolvedValue();
        mockVideoProcessor.extractFrames.mockResolvedValue(mockFrameFiles);
        mockFileStorage.uploadFile.mockResolvedValue('s3-key');
        mockFileStorage.createZip.mockResolvedValue();
        mockJobRepository.updateJobStatus.mockResolvedValue();
        mockJobRepository.findJobById.mockResolvedValue(mockCompletedJob);
        mockEmailNotificationService.notifyVideoProcessingComplete.mockResolvedValue();
      });

      it('Então deve processar o vídeo e retornar job concluído', async () => {
        const result = await service.processVideo(mockVideo, 'user-456');

        expect(result).toEqual(mockCompletedJob);
        expect(mockVideoProcessor.extractFrames).toHaveBeenCalledWith(
          expect.stringContaining('/tmp/job-123_test-video.mp4'),
          expect.stringContaining('/tmp/frames_job-123')
        );
        expect(mockFileStorage.createZip).toHaveBeenCalledWith(
          mockFrameFiles,
          expect.stringContaining('/tmp/job-123.zip')
        );
      });

      it('Então deve enviar notificação por email', async () => {
        await service.processVideo(mockVideo, 'user-456');

        expect(mockEmailNotificationService.notifyVideoProcessingComplete).toHaveBeenCalledWith(
          mockCompletedJob,
          'user-456'
        );
      });
    });

    describe('Quando a extração de frames falha', () => {
      const extractionError = new Error('FFmpeg not found');

      beforeEach(() => {
        mockFileStorage.fileExists.mockResolvedValue(true);
        mockFileStorage.downloadFile.mockResolvedValue();
        mockVideoProcessor.extractFrames.mockRejectedValue(extractionError);
        mockJobRepository.updateJobStatus.mockResolvedValue();
        mockJobRepository.findJobById.mockResolvedValue(mockCompletedJob);
        mockEmailNotificationService.notifyVideoProcessingComplete.mockResolvedValue();
      });

      it('Então deve atualizar job com status falhado', async () => {
        await expect(service.processVideo(mockVideo, 'user-456')).rejects.toThrow('FFmpeg not found');
      });

      it('Então deve enviar notificação por email para job falhado', async () => {
        await expect(service.processVideo(mockVideo, 'user-456')).rejects.toThrow('FFmpeg not found');
        expect(mockEmailNotificationService.notifyVideoProcessingComplete).toHaveBeenCalled();
      });
    });

    describe('Quando nenhum frame é extraído', () => {
      beforeEach(() => {
        mockFileStorage.fileExists.mockResolvedValue(true);
        mockFileStorage.downloadFile.mockResolvedValue();
        mockVideoProcessor.extractFrames.mockResolvedValue([]);
        mockJobRepository.updateJobStatus.mockResolvedValue();
        mockJobRepository.findJobById.mockResolvedValue(mockCompletedJob);
        mockEmailNotificationService.notifyVideoProcessingComplete.mockResolvedValue();
      });

      it('Então deve atualizar job com status falhado', async () => {
        await expect(service.processVideo(mockVideo, 'user-456')).rejects.toThrow('Nenhum frame extraído do vídeo');
      });
    });
  });
}); 