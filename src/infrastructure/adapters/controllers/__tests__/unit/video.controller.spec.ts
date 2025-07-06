import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { VideoController } from '../../video.controller';
import { UploadVideoUseCase } from '../../../../../application/usecases/upload-video.usecase';
import { GetJobStatusUseCase } from '../../../../../application/usecases/get-job-status.usecase';
import { ListAllJobsUseCase } from '../../../../../application/usecases/list-all-job-usecase';
import { FileStoragePort } from '../../../../../domain/ports/gateways/file-storage.port';
import { AuthenticatedRequest } from '../../../../middleware/jwt-auth.middleware';
import { ProcessingJob } from '../../../../../domain/entities/processing-job.entity';
import { Readable } from 'stream';

describe('VideoController - Unit Tests', () => {
  let controller: VideoController;
  let mockUploadVideoUseCase: jest.Mocked<UploadVideoUseCase>;
  let mockGetJobStatusUseCase: jest.Mocked<GetJobStatusUseCase>;
  let mockListAllJobsUseCase: jest.Mocked<ListAllJobsUseCase>;
  let mockFileStorage: jest.Mocked<FileStoragePort>;
  let mockResponse: jest.Mocked<Response>;

  const mockAuthenticatedRequest: AuthenticatedRequest = {
    userId: 'user-123',
    userEmail: 'test@example.com',
  } as AuthenticatedRequest;

  const mockFile: Express.Multer.File = {
    fieldname: 'video',
    originalname: 'test-video.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    size: 1024,
    destination: 'uploads',
    filename: '2024-01-01T00-00-00-000Z_test-video.mp4',
    path: 'uploads/2024-01-01T00-00-00-000Z_test-video.mp4',
    buffer: Buffer.from('test'),
    stream: new Readable(),
  };

  const mockJob: ProcessingJob = new ProcessingJob(
    'job-123',
    'video.mp4',
    'completed' as any,
    'Processamento concluído! 100 frames extraídos.',
    'user-123',
    100,
    '/outputs/job-123.zip',
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    mockUploadVideoUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetJobStatusUseCase = {
      execute: jest.fn(),
    } as any;

    mockListAllJobsUseCase = {
      execute: jest.fn(),
    } as any;

    mockFileStorage = {
      getFileStream: jest.fn(),
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: UploadVideoUseCase,
          useValue: mockUploadVideoUseCase,
        },
        {
          provide: GetJobStatusUseCase,
          useValue: mockGetJobStatusUseCase,
        },
        {
          provide: ListAllJobsUseCase,
          useValue: mockListAllJobsUseCase,
        },
        {
          provide: 'FileStoragePort',
          useValue: mockFileStorage,
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
  });

  describe('Given VideoController', () => {
    describe('When uploading video successfully', () => {
      beforeEach(() => {
        mockUploadVideoUseCase.execute.mockResolvedValue({
          success: true,
          message: 'Upload realizado com sucesso',
          jobId: 'job-123',
        });
      });

      it('Then should return success response', async () => {
        const result = await controller.uploadVideo(mockFile, mockAuthenticatedRequest);

        expect(result).toEqual({
          success: true,
          message: 'Upload realizado com sucesso',
          jobId: 'job-123',
        });
        expect(mockUploadVideoUseCase.execute).toHaveBeenCalledWith(
          mockFile,
          'user-123',
          'test@example.com'
        );
      });
    });

    describe('When upload fails', () => {
      const uploadError = new Error('Upload failed');

      beforeEach(() => {
        mockUploadVideoUseCase.execute.mockRejectedValue(uploadError);
      });

      it('Then should return error response', async () => {
        const result = await controller.uploadVideo(mockFile, mockAuthenticatedRequest);

        expect(result).toEqual({
          success: false,
          message: 'Erro interno: Upload failed',
        });
        expect(mockUploadVideoUseCase.execute).toHaveBeenCalled();
      });
    });

    describe('When getting job status', () => {
      describe('When job exists and belongs to user', () => {
        beforeEach(() => {
          mockGetJobStatusUseCase.execute.mockResolvedValue(mockJob);
        });

        it('Then should return job data', async () => {
          const result = await controller.getJobStatus('job-123', mockAuthenticatedRequest);

          expect(result).toEqual(mockJob);
          expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123', 'user-123');
        });
      });

      describe('When job does not exist or does not belong to user', () => {
        beforeEach(() => {
          mockGetJobStatusUseCase.execute.mockResolvedValue(null);
        });

        it('Then should return error message', async () => {
          const result = await controller.getJobStatus('job-123', mockAuthenticatedRequest);

          expect(result).toEqual({
            error: 'Job não encontrado ou não pertence ao usuário',
          });
          expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123', 'user-123');
        });
      });
    });

    describe('When downloading file', () => {
      const mockFileStream = new Readable();

      beforeEach(() => {
        mockFileStream._read = () => {};
        mockFileStream.pipe = jest.fn().mockReturnThis();
        mockGetJobStatusUseCase.execute.mockResolvedValue(mockJob);
        mockFileStorage.getFileStream.mockResolvedValue(mockFileStream);
      });

      describe('When job exists and is completed', () => {
        it('Then should stream file to response', async () => {
          await controller.downloadFile('job-123.zip', mockResponse, mockAuthenticatedRequest);

          expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123', 'user-123');
          expect(mockFileStorage.getFileStream).toHaveBeenCalledWith('outputs/job-123.zip');
          expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Content-Disposition',
            'attachment; filename="job-123.zip"'
          );
          expect(mockFileStream.pipe).toHaveBeenCalledWith(mockResponse);
        });
      });

      describe('When job does not exist', () => {
        beforeEach(() => {
          mockGetJobStatusUseCase.execute.mockResolvedValue(null);
        });

        it('Then should return forbidden error', async () => {
          await controller.downloadFile('job-123.zip', mockResponse, mockAuthenticatedRequest);

          expect(mockResponse.status).toHaveBeenCalledWith(403);
          expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Arquivo não encontrado ou não pertence ao usuário',
          });
        });
      });

      describe('When job is not completed', () => {
        beforeEach(() => {
          const pendingJob = new ProcessingJob(
            'job-123',
            'video.mp4',
            'pending' as any,
            'Vídeo adicionado à fila de processamento',
            'user-123',
            undefined,
            undefined,
            new Date(),
            new Date(),
          );
          mockGetJobStatusUseCase.execute.mockResolvedValue(pendingJob);
        });

        it('Then should return forbidden error', async () => {
          await controller.downloadFile('job-123.zip', mockResponse, mockAuthenticatedRequest);

          expect(mockResponse.status).toHaveBeenCalledWith(403);
          expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Arquivo não encontrado ou não pertence ao usuário',
          });
        });
      });

      describe('When file storage fails', () => {
        const storageError = new Error('S3 error');

        beforeEach(() => {
          mockFileStorage.getFileStream.mockRejectedValue(storageError);
        });

        it('Then should return not found error', async () => {
          await controller.downloadFile('job-123.zip', mockResponse, mockAuthenticatedRequest);

          expect(mockResponse.status).toHaveBeenCalledWith(404);
          expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Erro ao baixar arquivo do S3',
          });
        });
      });
    });

    describe('When getting status', () => {
      const mockJobs = [
        new ProcessingJob(
          'job-1',
          'video1.mp4',
          'completed' as any,
          'Processamento concluído! 100 frames extraídos.',
          'user-123',
          100,
          '/outputs/job-1.zip',
          new Date(),
          new Date(),
        ),
        new ProcessingJob(
          'job-2',
          'video2.mp4',
          'pending' as any,
          'Vídeo adicionado à fila de processamento',
          'user-123',
          undefined,
          undefined,
          new Date(),
          new Date(),
        ),
      ];

      describe('When jobs are retrieved successfully', () => {
        beforeEach(() => {
          mockListAllJobsUseCase.execute.mockResolvedValue(mockJobs);
        });

        it('Then should return formatted jobs with summary', async () => {
          const result = await controller.getStatus(mockAuthenticatedRequest);

          expect(result).toEqual({
            jobs: expect.any(Array),
            summary: {
              total: 2,
              pending: 1,
              processing: 0,
              completed: 1,
              failed: 0,
              totalFrames: 100,
            },
            userId: 'user-123',
          });
          expect(mockListAllJobsUseCase.execute).toHaveBeenCalledWith('user-123');
        });
      });

      describe('When listing jobs fails', () => {
        const listError = new Error('Database error');

        beforeEach(() => {
          mockListAllJobsUseCase.execute.mockRejectedValue(listError);
        });

        it('Then should return error response', async () => {
          const result = await controller.getStatus(mockAuthenticatedRequest);

          expect(result).toEqual({
            error: 'Erro ao listar jobs',
            jobs: [],
            summary: {
              total: 0,
              pending: 0,
              processing: 0,
              completed: 0,
              failed: 0,
              totalFrames: 0,
            },
            userId: 'user-123',
          });
          expect(mockListAllJobsUseCase.execute).toHaveBeenCalledWith('user-123');
        });
      });
    });
  });
}); 