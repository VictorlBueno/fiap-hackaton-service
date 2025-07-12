import { Test, TestingModule } from '@nestjs/testing';
import { JobRepositoryPort } from '../../../../domain/ports/repositories/job-repository.port';
import {JobStatus, ProcessingJob} from '../../../../domain/entities/processing-job.entity';
import { GetJobStatusUseCase } from '../../get-job-status.usecase';

describe('Caso de Uso de Obtenção de Status do Job - Testes Unitários', () => {
  let useCase: GetJobStatusUseCase;
  let jobRepository: jest.Mocked<JobRepositoryPort>;

  const mockJob = ProcessingJob.createCompleted(
    'job-123',
    'video.mp4',
    'user-456',
    150,
    'frames.zip',
  );

  beforeEach(async () => {
    const mockJobRepository: {
      findJobById: jest.Mock<any, any, any>;
      updateJobStatus: jest.Mock<any, any, any>;
      updateJobVideoPath: jest.Mock<any, any, any>;
    } = {
      findJobById: jest.fn(),
      updateJobStatus: jest.fn(),
      updateJobVideoPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetJobStatusUseCase,
        { provide: 'JobRepositoryPort', useValue: mockJobRepository },
      ],
    }).compile();

    useCase = module.get<GetJobStatusUseCase>(GetJobStatusUseCase);
    jobRepository = module.get('JobRepositoryPort');
  });

  describe('Dado o GetJobStatusUseCase', () => {
    describe('Quando executando com jobId e userId válidos', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(mockJob);
      });

      it('Então deve retornar o job de processamento', async () => {
        const result = await useCase.execute('job-123', 'user-456');

        expect(result).toBe(mockJob);
        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'job-123',
          'user-456',
        );
        expect(jobRepository.findJobById).toHaveBeenCalledTimes(1);
      });
    });

    describe('Quando o job existe mas pertence a usuário diferente', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Então deve retornar null', async () => {
        const result = await useCase.execute('job-123', 'different-user');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'job-123',
          'different-user',
        );
      });
    });

    describe('Quando o job não existe', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Então deve retornar null', async () => {
        const result = await useCase.execute('non-existent-job', 'user-456');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'non-existent-job',
          'user-456',
        );
      });
    });

    describe('Quando o repositório lança erro', () => {
      const repositoryError = new Error('Database connection failed');

      beforeEach(() => {
        jobRepository.findJobById.mockRejectedValue(repositoryError);
      });

      it('Então deve propagar o erro', async () => {
        await expect(useCase.execute('job-123', 'user-456')).rejects.toThrow(
          'Database connection failed',
        );

        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'job-123',
          'user-456',
        );
      });
    });

    describe('Quando chamado com jobId vazio', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Então deve passar string vazia para o repositório', async () => {
        const result = await useCase.execute('', 'user-456');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith('', 'user-456');
      });
    });

    describe('Quando chamado com userId vazio', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Então deve passar string vazia para o repositório', async () => {
        const result = await useCase.execute('job-123', '');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith('job-123', '');
      });
    });

    describe('Quando chamado múltiplas vezes com os mesmos parâmetros', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(mockJob);
      });

      it('Então deve chamar o repositório cada vez', async () => {
        await useCase.execute('job-123', 'user-456');
        await useCase.execute('job-123', 'user-456');

        expect(jobRepository.findJobById).toHaveBeenCalledTimes(2);
        expect(jobRepository.findJobById).toHaveBeenNthCalledWith(
          1,
          'job-123',
          'user-456',
        );
        expect(jobRepository.findJobById).toHaveBeenNthCalledWith(
          2,
          'job-123',
          'user-456',
        );
      });
    });

    describe('Quando o job tem diferentes status', () => {
      it('Então deve retornar job pendente corretamente', async () => {
        const pendingJob = ProcessingJob.createPending(
          'job-456',
          'video2.mp4',
          'user-789',
        );
        jobRepository.findJobById.mockResolvedValue(pendingJob);

        const result = await useCase.execute('job-456', 'user-789');

        expect(result).toBe(pendingJob);
        expect(result?.status).toBe(JobStatus.PENDING);
      });

      it('Então deve retornar job falhado corretamente', async () => {
        const failedJob = ProcessingJob.createFailed(
          'job-789',
          'video3.mp4',
          'user-123',
          'Codec error',
        );
        jobRepository.findJobById.mockResolvedValue(failedJob);

        const result = await useCase.execute('job-789', 'user-123');

        expect(result).toBe(failedJob);
        expect(result?.status).toBe(JobStatus.FAILED);
      });
    });
  });
});
