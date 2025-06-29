import { Test, TestingModule } from '@nestjs/testing';
import {UploadVideoUseCase} from "../../upload-video.usecase";
import {QueueMessage, QueuePort} from "../../../../domain/ports/gateways/queue.port";
import {JobRepositoryPort} from "../../../../domain/ports/repositories/job-repository.port";
import {FileStoragePort} from "../../../../domain/ports/gateways/file-storage.port";
import {ProcessingJob} from "../../../../domain/entities/processing-job.entity";

describe('UploadVideoUseCase - Unit Tests', () => {
  let useCase: UploadVideoUseCase;
  let queuePort: jest.Mocked<QueuePort>;
  let jobRepository: jest.Mocked<JobRepositoryPort>;
  let fileStorage: jest.Mocked<FileStoragePort>;

  const mockFile: Express.Multer.File = {
    fieldname: 'video',
    originalname: 'test-video.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    buffer: Buffer.from('fake video content'),
    size: 1024000,
    path: '/uploads/test-video.mp4',
    filename: 'test-video.mp4',
    destination: '/uploads',
    stream: null as any,
  };

  const userId = 'user-123';

  beforeEach(async () => {
    const mockQueuePort: { sendMessage: jest.Mock<any, any, any> } = {
      sendMessage: jest.fn(),
    };

    const mockJobRepository: {
      saveJob: jest.Mock<any, any, any>;
      findJobById: jest.Mock<any, any, any>;
      getAllJobsByUser: jest.Mock<any, any, any>;
      updateJobStatus: jest.Mock<any, any, any>;
      updateJobVideoPath: jest.Mock<any, any, any>
    } = {
      saveJob: jest.fn(),
      findJobById: jest.fn(),
      getAllJobsByUser: jest.fn(),
      updateJobStatus: jest.fn(),
      updateJobVideoPath: jest.fn(),
    };

    const mockFileStorage: jest.Mocked<FileStoragePort> = {
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      createZip: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadVideoUseCase,
        { provide: 'QueuePort', useValue: mockQueuePort },
        { provide: 'JobRepositoryPort', useValue: mockJobRepository },
        { provide: 'FileStoragePort', useValue: mockFileStorage },
      ],
    }).compile();

    useCase = module.get<UploadVideoUseCase>(UploadVideoUseCase);
    queuePort = module.get('QueuePort');
    jobRepository = module.get('JobRepositoryPort');
    fileStorage = module.get('FileStoragePort');
  });

  describe('Given UploadVideoUseCase', () => {
    describe('When uploading valid video file successfully', () => {
      beforeEach(() => {
        jobRepository.saveJob.mockResolvedValue(undefined);
        queuePort.sendMessage.mockResolvedValue(true);
      });

      it('Then should return success response with job details', async () => {
        const result = await useCase.execute(mockFile, userId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Vídeo adicionado à fila com sucesso! Aguarde o processamento.');
        expect(result.jobId).toBeDefined();
        expect(result.statusUrl).toMatch(/^\/api\/job\/.+$/);
      });

      it('Then should save job with pending status', async () => {
        await useCase.execute(mockFile, userId);

        expect(jobRepository.saveJob).toHaveBeenCalledTimes(1);
        const savedJob = jobRepository.saveJob.mock.calls[0][0] as ProcessingJob;
        expect(savedJob.videoName).toBe(mockFile.originalname);
        expect(savedJob.userId).toBe(userId);
        expect(savedJob.status).toBe('pending');
      });

      it('Then should send message to queue with correct data', async () => {
        await useCase.execute(mockFile, userId);

        expect(queuePort.sendMessage).toHaveBeenCalledTimes(1);
        const queueMessage = queuePort.sendMessage.mock.calls[0][0] as QueueMessage;
        expect(queueMessage.videoPath).toBe(mockFile.path);
        expect(queueMessage.videoName).toBe(mockFile.originalname);
        expect(queueMessage.userId).toBe(userId);
        expect(queueMessage.id).toBeDefined();
      });
    });

    describe('When no file is provided', () => {
      it('Then should return error response', async () => {
        const result = await useCase.execute(null as any, userId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Nenhum arquivo recebido');
        expect(result.jobId).toBeUndefined();
        expect(result.statusUrl).toBeUndefined();
      });

      it('Then should not interact with any dependencies', async () => {
        await useCase.execute(null as any, userId);

        expect(jobRepository.saveJob).not.toHaveBeenCalled();
        expect(queuePort.sendMessage).not.toHaveBeenCalled();
        expect(fileStorage.deleteFile).not.toHaveBeenCalled();
      });
    });

    describe('When file has invalid format', () => {
      const invalidFile = { ...mockFile, originalname: 'document.pdf' };

      beforeEach(() => {
        fileStorage.deleteFile.mockResolvedValue(undefined);
      });

      it('Then should return format error response', async () => {
        const result = await useCase.execute(invalidFile, userId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Formato não suportado. Use: mp4, avi, mov, mkv, wmv, flv, webm');
        expect(result.jobId).toBeUndefined();
      });

      it('Then should delete uploaded file', async () => {
        await useCase.execute(invalidFile, userId);

        expect(fileStorage.deleteFile).toHaveBeenCalledWith(invalidFile.path);
      });

      it('Then should not save job or send queue message', async () => {
        await useCase.execute(invalidFile, userId);

        expect(jobRepository.saveJob).not.toHaveBeenCalled();
        expect(queuePort.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When queue sending fails', () => {
      beforeEach(() => {
        jobRepository.saveJob.mockResolvedValue(undefined);
        queuePort.sendMessage.mockResolvedValue(false);
      });

      it('Then should return queue error response', async () => {
        const result = await useCase.execute(mockFile, userId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Erro ao adicionar vídeo à fila. Tente novamente.');
        expect(result.jobId).toBeUndefined();
      });

      it('Then should still save job before queue attempt', async () => {
        await useCase.execute(mockFile, userId);

        expect(jobRepository.saveJob).toHaveBeenCalledTimes(1);
      });
    });

    describe('When job repository save fails', () => {
      const repositoryError = new Error('Database connection failed');

      beforeEach(() => {
        jobRepository.saveJob.mockRejectedValue(repositoryError);
      });

      it('Then should propagate the error', async () => {
        await expect(useCase.execute(mockFile, userId)).rejects.toThrow('Database connection failed');

        expect(jobRepository.saveJob).toHaveBeenCalledTimes(1);
        expect(queuePort.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When file deletion fails', () => {
      const invalidFile = { ...mockFile, originalname: 'document.txt' };
      const deletionError = new Error('File system error');

      beforeEach(() => {
        fileStorage.deleteFile.mockRejectedValue(deletionError);
      });

      it('Then should propagate the deletion error', async () => {
        await expect(useCase.execute(invalidFile, userId)).rejects.toThrow('File system error');

        expect(fileStorage.deleteFile).toHaveBeenCalledWith(invalidFile.path);
      });
    });

    describe('When queue throws exception', () => {
      const queueError = new Error('Queue service unavailable');

      beforeEach(() => {
        jobRepository.saveJob.mockResolvedValue(undefined);
        queuePort.sendMessage.mockRejectedValue(queueError);
      });

      it('Then should propagate the queue error', async () => {
        await expect(useCase.execute(mockFile, userId)).rejects.toThrow('Queue service unavailable');

        expect(jobRepository.saveJob).toHaveBeenCalledTimes(1);
        expect(queuePort.sendMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('When processing different video formats', () => {
      const validFormats = ['video.mp4', 'movie.avi', 'clip.mov', 'film.mkv', 'video.wmv', 'stream.flv', 'web.webm'];

      beforeEach(() => {
        jobRepository.saveJob.mockResolvedValue(undefined);
        queuePort.sendMessage.mockResolvedValue(true);
      });

      validFormats.forEach(filename => {
        it(`Then should accept ${filename} format`, async () => {
          const fileWithFormat = { ...mockFile, originalname: filename };
          const result = await useCase.execute(fileWithFormat, userId);

          expect(result.success).toBe(true);
          expect(jobRepository.saveJob).toHaveBeenCalled();
          expect(queuePort.sendMessage).toHaveBeenCalled();
        });
      });
    });

    describe('When called with different user IDs', () => {
      beforeEach(() => {
        jobRepository.saveJob.mockResolvedValue(undefined);
        queuePort.sendMessage.mockResolvedValue(true);
      });

      it('Then should associate job with correct user', async () => {
        const differentUserId = 'user-456';
        await useCase.execute(mockFile, differentUserId);

        const savedJob = jobRepository.saveJob.mock.calls[0][0] as ProcessingJob;
        const queueMessage = queuePort.sendMessage.mock.calls[0][0] as QueueMessage;

        expect(savedJob.userId).toBe(differentUserId);
        expect(queueMessage.userId).toBe(differentUserId);
      });
    });
  });
});