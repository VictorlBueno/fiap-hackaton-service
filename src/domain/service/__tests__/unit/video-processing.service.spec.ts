import { Test, TestingModule } from '@nestjs/testing';
import { VideoProcessingService } from '../../video-processing.service';
import { Video } from '../../../entities/video.entity';
import { ProcessingJob, JobStatus } from '../../../entities/processing-job.entity';
import { EmailNotificationService } from '../../email-notification.service';

describe('VideoProcessingService', () => {
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

  describe('Given VideoProcessingService', () => {
    describe('When processing video successfully', () => {
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

      it('Then should process video and return completed job', async () => {
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

      it('Then should send email notification', async () => {
        await service.processVideo(mockVideo, 'user-456');

        expect(mockEmailNotificationService.notifyVideoProcessingComplete).toHaveBeenCalledWith(
          mockCompletedJob,
          'user-456'
        );
      });
    });

    describe('When frame extraction fails', () => {
      const extractionError = new Error('FFmpeg not found');

      beforeEach(() => {
        mockFileStorage.fileExists.mockResolvedValue(true);
        mockFileStorage.downloadFile.mockResolvedValue();
        mockVideoProcessor.extractFrames.mockRejectedValue(extractionError);
        mockJobRepository.updateJobStatus.mockResolvedValue();
        mockJobRepository.findJobById.mockResolvedValue(mockCompletedJob);
        mockEmailNotificationService.notifyVideoProcessingComplete.mockResolvedValue();
      });

      it('Then should update job with failed status', async () => {
        await expect(service.processVideo(mockVideo, 'user-456')).rejects.toThrow('FFmpeg not found');
      });

      it('Then should send email notification for failed job', async () => {
        await expect(service.processVideo(mockVideo, 'user-456')).rejects.toThrow('FFmpeg not found');
        expect(mockEmailNotificationService.notifyVideoProcessingComplete).toHaveBeenCalled();
      });
    });

    describe('When no frames are extracted', () => {
      beforeEach(() => {
        mockFileStorage.fileExists.mockResolvedValue(true);
        mockFileStorage.downloadFile.mockResolvedValue();
        mockVideoProcessor.extractFrames.mockResolvedValue([]);
        mockJobRepository.updateJobStatus.mockResolvedValue();
        mockJobRepository.findJobById.mockResolvedValue(mockCompletedJob);
        mockEmailNotificationService.notifyVideoProcessingComplete.mockResolvedValue();
      });

      it('Then should update job with failed status', async () => {
        await expect(service.processVideo(mockVideo, 'user-456')).rejects.toThrow('Nenhum frame extraído do vídeo');
      });
    });
  });
}); 