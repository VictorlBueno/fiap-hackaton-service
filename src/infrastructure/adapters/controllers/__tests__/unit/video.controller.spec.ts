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
import { MetricsService } from '../../../services/metrics.service';

describe('Controlador de Vídeo - Testes Unitários', () => {
  let controller: VideoController;
  let mockUploadVideoUseCase: jest.Mocked<UploadVideoUseCase>;
  let mockGetJobStatusUseCase: jest.Mocked<GetJobStatusUseCase>;
  let mockListAllJobsUseCase: jest.Mocked<ListAllJobsUseCase>;
  let mockFileStorage: jest.Mocked<FileStoragePort>;
  let mockResponse: jest.Mocked<Response>;
  let mockMetricsService: any;

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

    mockMetricsService = {
      incrementVideoUpload: jest.fn(),
      setActiveJobs: jest.fn(),
      setProcessingJobs: jest.fn(),
    };

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
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
  });

  describe('Dado o VideoController', () => {
    describe('Quando fazendo upload de vídeo com sucesso', () => {
      beforeEach(() => {
        mockUploadVideoUseCase.execute.mockResolvedValue({
          success: true,
          message: 'Upload realizado com sucesso',
          jobId: 'job-123',
        });
      });

      it('Então deve retornar resposta de sucesso', async () => {
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

    describe('Quando o upload falha', () => {
      const uploadError = new Error('Upload failed');

      beforeEach(() => {
        mockUploadVideoUseCase.execute.mockRejectedValue(uploadError);
      });

      it('Então deve retornar resposta de erro', async () => {
        const result = await controller.uploadVideo(mockFile, mockAuthenticatedRequest);

        expect(result).toEqual({
          success: false,
          message: 'Erro interno: Upload failed',
        });
        expect(mockUploadVideoUseCase.execute).toHaveBeenCalled();
      });
    });

    describe('Quando obtendo status do job', () => {
      describe('Quando o job existe e pertence ao usuário', () => {
        beforeEach(() => {
          mockGetJobStatusUseCase.execute.mockResolvedValue(mockJob);
        });

        it('Então deve retornar dados do job', async () => {
          const result = await controller.getJobStatus('job-123', mockAuthenticatedRequest);

          expect(result).toEqual({
            id: mockJob.id,
            videoName: mockJob.videoName,
            status: mockJob.status,
            message: mockJob.message,
            frameCount: mockJob.frameCount,
            zipFilename: mockJob.zipPath,
            downloadUrl: mockJob.status === 'completed' && mockJob.zipPath ? `/download/${mockJob.zipPath}` : null,
            createdAt: mockJob.createdAt.toISOString(),
            updatedAt: mockJob.updatedAt ? mockJob.updatedAt.toISOString() : mockJob.createdAt.toISOString(),
            duration: expect.any(String),
            canDownload: mockJob.status === 'completed' && !!mockJob.zipPath,
          });
          expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123', 'user-123');
        });
      });

      describe('Quando o job não existe ou não pertence ao usuário', () => {
        beforeEach(() => {
          mockGetJobStatusUseCase.execute.mockResolvedValue(null);
        });

        it('Então deve retornar mensagem de erro', async () => {
          const result = await controller.getJobStatus('job-123', mockAuthenticatedRequest);

          expect(result).toEqual({
            error: 'Job não encontrado ou não pertence ao usuário',
          });
          expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123', 'user-123');
        });
      });
    });

    describe('Quando baixando arquivo', () => {
      const mockFileStream = new Readable();

      beforeEach(() => {
        mockFileStream._read = () => {};
        mockFileStream.pipe = jest.fn().mockReturnThis();
        mockGetJobStatusUseCase.execute.mockResolvedValue(mockJob);
        mockFileStorage.getFileStream.mockResolvedValue(mockFileStream);
      });

      describe('Quando o job existe e está concluído', () => {
        it('Então deve fazer stream do arquivo para a resposta', async () => {
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

      describe('Quando o job não existe', () => {
        beforeEach(() => {
          mockGetJobStatusUseCase.execute.mockResolvedValue(null);
        });

        it('Então deve retornar erro de acesso negado', async () => {
          await controller.downloadFile('job-123.zip', mockResponse, mockAuthenticatedRequest);

          expect(mockResponse.status).toHaveBeenCalledWith(403);
          expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Arquivo não encontrado ou não pertence ao usuário',
          });
        });
      });

      describe('Quando o job não está concluído', () => {
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

        it('Então deve retornar erro de acesso negado', async () => {
          await controller.downloadFile('job-123.zip', mockResponse, mockAuthenticatedRequest);

          expect(mockResponse.status).toHaveBeenCalledWith(403);
          expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Arquivo não encontrado ou não pertence ao usuário',
          });
        });
      });

      describe('Quando o storage de arquivo falha', () => {
        const storageError = new Error('S3 error');

        beforeEach(() => {
          mockFileStorage.getFileStream.mockRejectedValue(storageError);
        });

        it('Então deve retornar erro de não encontrado', async () => {
          await controller.downloadFile('job-123.zip', mockResponse, mockAuthenticatedRequest);

          expect(mockResponse.status).toHaveBeenCalledWith(404);
          expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Erro ao baixar arquivo do S3',
          });
        });
      });
    });

    describe('Quando obtendo status', () => {
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

      describe('Quando os jobs são recuperados com sucesso', () => {
        beforeEach(() => {
          mockListAllJobsUseCase.execute.mockResolvedValue(mockJobs);
        });

        it('Então deve retornar jobs formatados com resumo', async () => {
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

      describe('Quando a listagem de jobs falha', () => {
        const listError = new Error('Database error');

        beforeEach(() => {
          mockListAllJobsUseCase.execute.mockRejectedValue(listError);
        });

        it('Então deve retornar resposta de erro', async () => {
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