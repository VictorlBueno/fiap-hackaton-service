import { Test, TestingModule } from '@nestjs/testing';
import { UploadVideoUseCase } from '../../upload-video.usecase';
import { FileStoragePort } from '../../../../domain/ports/gateways/file-storage.port';
import { QueuePort } from '../../../../domain/ports/gateways/queue.port';
import { JobRepositoryPort } from '../../../../domain/ports/repositories/job-repository.port';
import { Video } from '../../../../domain/entities/video.entity';
import { ProcessingJob, JobStatus } from '../../../../domain/entities/processing-job.entity';

describe('UploadVideoUseCase', () => {
  let useCase: UploadVideoUseCase;
  let mockFileStorage: jest.Mocked<FileStoragePort>;
  let mockQueue: jest.Mocked<QueuePort>;
  let mockJobRepository: jest.Mocked<JobRepositoryPort>;

  const mockFile = {
    originalname: 'test-video.mp4',
    mimetype: 'video/mp4',
    size: 1024 * 1024,
    path: '/uploads/test-video.mp4',
    buffer: Buffer.from('test video content'),
  } as Express.Multer.File;

  const mockUserId = 'user-123';
  const mockUserEmail = 'user@example.com';

  const mockVideo = Video.create(
    'test-video.mp4',
    '/uploads/test-video.mp4',
    1024 * 1024,
    mockUserId,
  );

  const mockProcessingJob = new ProcessingJob(
    'job-123',
    'test-video.mp4',
    JobStatus.PENDING,
    'Vídeo adicionado à fila de processamento',
    mockUserId,
    undefined,
    undefined,
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    mockFileStorage = {
      uploadFile: jest.fn(),
      fileExists: jest.fn(),
      createZip: jest.fn(),
      deleteFile: jest.fn(),
      getFileStream: jest.fn(),
      downloadFile: jest.fn(),
      getSignedDownloadUrl: jest.fn(),
    } as any;

    mockQueue = {
      sendMessage: jest.fn(),
      consumeMessages: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    mockJobRepository = {
      saveJob: jest.fn(),
      findJobById: jest.fn(),
      updateJobStatus: jest.fn(),
      updateJobVideoPath: jest.fn(),
      getAllJobsByUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadVideoUseCase,
        {
          provide: 'FileStoragePort',
          useValue: mockFileStorage,
        },
        {
          provide: 'QueuePort',
          useValue: mockQueue,
        },
        {
          provide: 'JobRepositoryPort',
          useValue: mockJobRepository,
        },
      ],
    }).compile();

    useCase = module.get<UploadVideoUseCase>(UploadVideoUseCase);
  });

  describe('Given UploadVideoUseCase', () => {
    describe('When uploading a valid video successfully', () => {
      beforeEach(() => {
        mockFileStorage.uploadFile.mockResolvedValue('mock-upload-path');
        mockJobRepository.saveJob.mockResolvedValue(undefined);
        mockQueue.sendMessage.mockResolvedValue(true);
      });

      it('Then should upload video and create processing job', async () => {
        const result = await useCase.execute(mockFile, mockUserId, mockUserEmail);

        expect(result).toEqual({
          success: true,
          message: 'Vídeo adicionado à fila com sucesso! Aguarde o processamento.',
          jobId: expect.any(String),
          statusUrl: expect.stringContaining('/api/job/'),
        });

        expect(mockFileStorage.uploadFile).toHaveBeenCalledWith(
          mockFile.path,
          expect.stringContaining('uploads/'),
        );
        expect(mockJobRepository.saveJob).toHaveBeenCalledWith(
          expect.objectContaining({
            videoName: mockFile.originalname,
            status: JobStatus.PENDING,
            userId: mockUserId,
          }),
        );
        expect(mockQueue.sendMessage).toHaveBeenCalledWith({
          id: expect.any(String),
          videoPath: mockFile.path,
          videoName: mockFile.originalname,
          userId: mockUserId,
          userEmail: mockUserEmail,
        });
      });

      it('Then should handle different video formats', async () => {
        const aviFile = {
          ...mockFile,
          originalname: 'test-video.avi',
          mimetype: 'video/x-msvideo',
        } as Express.Multer.File;

        const result = await useCase.execute(aviFile, mockUserId, mockUserEmail);

        expect(result.success).toBe(true);
        expect(mockQueue.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            videoName: 'test-video.avi',
          }),
        );
      });

      it('Then should handle MOV format', async () => {
        const movFile = {
          ...mockFile,
          originalname: 'test-video.mov',
          mimetype: 'video/quicktime',
        } as Express.Multer.File;

        const result = await useCase.execute(movFile, mockUserId, mockUserEmail);

        expect(result.success).toBe(true);
        expect(mockQueue.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            videoName: 'test-video.mov',
          }),
        );
      });
    });

    describe('When no file is provided', () => {
      it('Then should return error response', async () => {
        const result = await useCase.execute(null as any, mockUserId, mockUserEmail);

        expect(result).toEqual({
          success: false,
          message: 'Nenhum arquivo recebido',
        });
        expect(mockFileStorage.uploadFile).not.toHaveBeenCalled();
        expect(mockJobRepository.saveJob).not.toHaveBeenCalled();
        expect(mockQueue.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When video format is not supported', () => {
      const unsupportedFile = {
        ...mockFile,
        originalname: 'test-video.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      beforeEach(() => {
        mockFileStorage.deleteFile.mockResolvedValue(undefined);
      });

      it('Then should delete file and return error response', async () => {
        const result = await useCase.execute(unsupportedFile, mockUserId, mockUserEmail);

        expect(result).toEqual({
          success: false,
          message: 'Formato não suportado. Use: mp4, avi, mov, mkv, wmv, flv, webm',
        });
        expect(mockFileStorage.deleteFile).toHaveBeenCalledWith(unsupportedFile.path);
        expect(mockJobRepository.saveJob).not.toHaveBeenCalled();
        expect(mockQueue.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When queue message sending fails', () => {
      beforeEach(() => {
        mockFileStorage.uploadFile.mockResolvedValue('mock-upload-path');
        mockJobRepository.saveJob.mockResolvedValue(undefined);
        mockQueue.sendMessage.mockResolvedValue(false);
      });

      it('Then should return error response', async () => {
        const result = await useCase.execute(mockFile, mockUserId, mockUserEmail);

        expect(result).toEqual({
          success: false,
          message: 'Erro ao adicionar vídeo à fila. Tente novamente.',
        });
      });
    });

    describe('When file storage upload fails', () => {
      beforeEach(() => {
        mockFileStorage.uploadFile.mockRejectedValue(new Error('S3 upload failed'));
      });

      it('Then should propagate the error', async () => {
        await expect(useCase.execute(mockFile, mockUserId, mockUserEmail)).rejects.toThrow(
          'S3 upload failed',
        );
      });
    });

    describe('When job repository save fails', () => {
      beforeEach(() => {
        mockFileStorage.uploadFile.mockResolvedValue('mock-upload-path');
        mockJobRepository.saveJob.mockRejectedValue(new Error('Database error'));
      });

      it('Then should propagate the error', async () => {
        await expect(useCase.execute(mockFile, mockUserId, mockUserEmail)).rejects.toThrow(
          'Database error',
        );
      });
    });

    describe('When queue send message throws error', () => {
      beforeEach(() => {
        mockFileStorage.uploadFile.mockResolvedValue('mock-upload-path');
        mockJobRepository.saveJob.mockResolvedValue(undefined);
        mockQueue.sendMessage.mockRejectedValue(new Error('Queue connection failed'));
      });

      it('Then should propagate the error', async () => {
        await expect(useCase.execute(mockFile, mockUserId, mockUserEmail)).rejects.toThrow(
          'Queue connection failed',
        );
      });
    });

    describe('When handling edge cases', () => {
      beforeEach(() => {
        mockFileStorage.uploadFile.mockResolvedValue('mock-upload-path');
        mockJobRepository.saveJob.mockResolvedValue(undefined);
        mockQueue.sendMessage.mockResolvedValue(true);
      });

      it('Then should handle empty user email', async () => {
        const result = await useCase.execute(mockFile, mockUserId, undefined);

        expect(result.success).toBe(true);
        expect(mockQueue.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            userEmail: undefined,
          }),
        );
      });

      it('Then should handle zero file size', async () => {
        const zeroSizeFile = {
          ...mockFile,
          size: 0,
        } as Express.Multer.File;

        const result = await useCase.execute(zeroSizeFile, mockUserId, mockUserEmail);

        expect(result.success).toBe(true);
      });

      it('Then should handle large file size', async () => {
        const largeFile = {
          ...mockFile,
          size: 100 * 1024 * 1024, // 100MB
        } as Express.Multer.File;

        const result = await useCase.execute(largeFile, mockUserId, mockUserEmail);

        expect(result.success).toBe(true);
      });
    });

    describe('When handling different video formats validation', () => {
      beforeEach(() => {
        mockFileStorage.uploadFile.mockResolvedValue('mock-upload-path');
        mockJobRepository.saveJob.mockResolvedValue(undefined);
        mockQueue.sendMessage.mockResolvedValue(true);
      });

      it('Then should accept MP4 format', async () => {
        const mp4File = { ...mockFile, originalname: 'test.mp4' } as Express.Multer.File;
        const result = await useCase.execute(mp4File, mockUserId, mockUserEmail);
        expect(result.success).toBe(true);
      });

      it('Then should accept AVI format', async () => {
        const aviFile = { ...mockFile, originalname: 'test.avi' } as Express.Multer.File;
        const result = await useCase.execute(aviFile, mockUserId, mockUserEmail);
        expect(result.success).toBe(true);
      });

      it('Then should accept MOV format', async () => {
        const movFile = { ...mockFile, originalname: 'test.mov' } as Express.Multer.File;
        const result = await useCase.execute(movFile, mockUserId, mockUserEmail);
        expect(result.success).toBe(true);
      });

      it('Then should accept MKV format', async () => {
        const mkvFile = { ...mockFile, originalname: 'test.mkv' } as Express.Multer.File;
        const result = await useCase.execute(mkvFile, mockUserId, mockUserEmail);
        expect(result.success).toBe(true);
      });

      it('Then should accept WMV format', async () => {
        const wmvFile = { ...mockFile, originalname: 'test.wmv' } as Express.Multer.File;
        const result = await useCase.execute(wmvFile, mockUserId, mockUserEmail);
        expect(result.success).toBe(true);
      });

      it('Then should accept FLV format', async () => {
        const flvFile = { ...mockFile, originalname: 'test.flv' } as Express.Multer.File;
        const result = await useCase.execute(flvFile, mockUserId, mockUserEmail);
        expect(result.success).toBe(true);
      });

      it('Then should accept WEBM format', async () => {
        const webmFile = { ...mockFile, originalname: 'test.webm' } as Express.Multer.File;
        const result = await useCase.execute(webmFile, mockUserId, mockUserEmail);
        expect(result.success).toBe(true);
      });

      it('Then should reject unsupported format', async () => {
        const unsupportedFile = { ...mockFile, originalname: 'test.xyz' } as Express.Multer.File;
        const result = await useCase.execute(unsupportedFile, mockUserId, mockUserEmail);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Formato não suportado');
      });
    });
  });
});