import { Test, TestingModule } from '@nestjs/testing';
import { VideoProcessorPort } from '../../ports/gateways/video-processor.port';
import { VideoProcessingService } from '../video-processing.service';
import { FileStoragePort } from '../../ports/gateways/file-storage.port';
import { JobRepositoryPort } from '../../ports/repositories/job-repository.port';
import { Video } from '../../entities/video.entity';
import { JobStatus, ProcessingJob } from '../../entities/processing-job.entity';

describe('VideoProcessingService', () => {
  let service: VideoProcessingService;
  let videoProcessor: jest.Mocked<VideoProcessorPort>;
  let fileStorage: jest.Mocked<FileStoragePort>;
  let jobRepository: jest.Mocked<JobRepositoryPort>;

  const mockVideo = Video.create(
    'test.mp4',
    '/uploads/test.mp4',
    1024000,
    'user-123',
  );
  const mockJob = ProcessingJob.createCompleted(
    'job-1',
    'test.mp4',
    'user-123',
    150,
    'frames.zip',
  );

  beforeEach(async () => {
    const mockVideoProcessor: jest.Mocked<VideoProcessorPort> = {
      extractFrames: jest.fn(),
    };

    const mockFileStorage: jest.Mocked<FileStoragePort> = {
      fileExists: jest.fn(),
      createZip: jest.fn(),
      deleteFile: jest.fn(),
    };

    const mockJobRepository: {
      updateJobStatus: jest.Mock<any, any, any>;
      updateJobVideoPath: jest.Mock<any, any, any>;
      findJobById: jest.Mock<any, any, any>;
    } = {
      updateJobStatus: jest.fn(),
      updateJobVideoPath: jest.fn(),
      findJobById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProcessingService,
        { provide: 'VideoProcessorPort', useValue: mockVideoProcessor },
        { provide: 'FileStoragePort', useValue: mockFileStorage },
        { provide: 'JobRepositoryPort', useValue: mockJobRepository },
      ],
    }).compile();

    service = module.get<VideoProcessingService>(VideoProcessingService);
    videoProcessor = module.get('VideoProcessorPort');
    fileStorage = module.get('FileStoragePort');
    jobRepository = module.get('JobRepositoryPort');
  });

  describe('Given VideoProcessingService', () => {
    describe('When processing a valid video successfully', () => {
      beforeEach(() => {
        fileStorage.fileExists
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true);
        videoProcessor.extractFrames.mockResolvedValue([
          'frame1.jpg',
          'frame2.jpg',
        ]);
        fileStorage.createZip.mockResolvedValue(undefined);
        fileStorage.deleteFile.mockResolvedValue(undefined);
        jobRepository.findJobById.mockResolvedValue(mockJob);
      });

      it('Then should complete processing successfully', async () => {
        const result = await service.processVideo(mockVideo);

        expect(result).toBe(mockJob);
        expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
          mockVideo.id,
          JobStatus.PROCESSING,
          'Processando vídeo e extraindo frames...',
        );
        expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
          mockVideo.id,
          JobStatus.COMPLETED,
          'Processamento concluído! 2 frames extraídos.',
          { frameCount: 2, zipPath: `${mockVideo.id}.zip` },
        );
      });

      it('Then should update video path in job', async () => {
        await service.processVideo(mockVideo);

        expect(jobRepository.updateJobVideoPath).toHaveBeenCalledWith(
          mockVideo.id,
          mockVideo.path,
        );
      });

      it('Then should extract frames to correct temp directory', async () => {
        await service.processVideo(mockVideo);

        expect(videoProcessor.extractFrames).toHaveBeenCalledWith(
          mockVideo.path,
          `temp/${mockVideo.id}`,
        );
      });

      it('Then should create zip with extracted frames', async () => {
        await service.processVideo(mockVideo);

        expect(fileStorage.createZip).toHaveBeenCalledWith(
          ['frame1.jpg', 'frame2.jpg'],
          `outputs/${mockVideo.id}.zip`,
        );
      });

      it('Then should delete original video file', async () => {
        await service.processVideo(mockVideo);

        expect(fileStorage.deleteFile).toHaveBeenCalledWith(mockVideo.path);
      });
    });

    describe('When video file does not exist', () => {
      beforeEach(() => {
        fileStorage.fileExists.mockResolvedValue(false);
      });

      it('Then should fail with file not found error', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow(
          `Arquivo de vídeo não encontrado: ${mockVideo.path}`,
        );

        expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
          mockVideo.id,
          JobStatus.FAILED,
          `Arquivo de vídeo não encontrado: ${mockVideo.path}`,
        );
      });

      it('Then should not attempt frame extraction', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow();

        expect(videoProcessor.extractFrames).not.toHaveBeenCalled();
      });
    });

    describe('When no frames are extracted', () => {
      beforeEach(() => {
        fileStorage.fileExists.mockResolvedValue(true);
        videoProcessor.extractFrames.mockResolvedValue([]);
      });

      it('Then should fail with no frames error', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow(
          'Nenhum frame extraído do vídeo',
        );

        expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
          mockVideo.id,
          JobStatus.FAILED,
          'Nenhum frame extraído do vídeo',
        );
      });

      it('Then should not create zip file', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow();

        expect(fileStorage.createZip).not.toHaveBeenCalled();
      });
    });

    describe('When zip creation fails', () => {
      beforeEach(() => {
        fileStorage.fileExists
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false);
        videoProcessor.extractFrames.mockResolvedValue(['frame1.jpg']);
        fileStorage.createZip.mockResolvedValue(undefined);
      });

      it('Then should fail with zip creation error', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow(
          'Falha ao criar arquivo ZIP',
        );

        expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
          mockVideo.id,
          JobStatus.FAILED,
          'Falha ao criar arquivo ZIP',
        );
      });
    });

    describe('When frame extraction throws error', () => {
      const extractionError = new Error('Codec não suportado');

      beforeEach(() => {
        fileStorage.fileExists.mockResolvedValue(true);
        videoProcessor.extractFrames.mockRejectedValue(extractionError);
      });

      it('Then should handle error and update job status', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow(
          'Codec não suportado',
        );

        expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
          mockVideo.id,
          JobStatus.FAILED,
          'Codec não suportado',
        );
      });

      it('Then should not attempt zip creation after failure', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow();

        expect(fileStorage.createZip).not.toHaveBeenCalled();
      });
    });

    describe('When zip creation throws error', () => {
      const zipError = new Error('Espaço em disco insuficiente');

      beforeEach(() => {
        fileStorage.fileExists.mockResolvedValue(true);
        videoProcessor.extractFrames.mockResolvedValue(['frame1.jpg']);
        fileStorage.createZip.mockRejectedValue(zipError);
      });

      it('Then should handle error and update job status', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow(
          'Espaço em disco insuficiente',
        );

        expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
          mockVideo.id,
          JobStatus.FAILED,
          'Espaço em disco insuficiente',
        );
      });
    });

    describe('When job repository operations fail', () => {
      const repositoryError = new Error('Database connection failed');

      beforeEach(() => {
        jobRepository.updateJobStatus.mockRejectedValue(repositoryError);
      });

      it('Then should propagate repository errors', async () => {
        await expect(service.processVideo(mockVideo)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('When final job retrieval fails', () => {
      beforeEach(() => {
        fileStorage.fileExists
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true);
        videoProcessor.extractFrames.mockResolvedValue(['frame1.jpg']);
        fileStorage.createZip.mockResolvedValue(undefined);
        fileStorage.deleteFile.mockResolvedValue(undefined);
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Then should return null when job is not found', async () => {
        const result = await service.processVideo(mockVideo);

        expect(result).toBeNull();
      });
    });
  });
});
