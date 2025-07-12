import { Test, TestingModule } from '@nestjs/testing';
import {ListAllJobsUseCase} from "../../list-all-job-usecase";
import {JobRepositoryPort} from "../../../../domain/ports/repositories/job-repository.port";
import {JobStatus, ProcessingJob} from "../../../../domain/entities/processing-job.entity";

describe('Caso de Uso de Listagem de Todos os Jobs - Testes Unitários', () => {
  let useCase: ListAllJobsUseCase;
  let jobRepository: jest.Mocked<JobRepositoryPort>;

  const mockJobs = [
    ProcessingJob.createCompleted('job-1', 'video1.mp4', 'user-123', 150, 'frames1.zip'),
    ProcessingJob.createPending('job-2', 'video2.mp4', 'user-123'),
    ProcessingJob.createFailed('job-3', 'video3.mp4', 'user-123', 'Codec error'),
  ];

  beforeEach(async () => {
    const mockJobRepository: {
      getAllJobsByUser: jest.Mock<any, any, any>;
      findJobById: jest.Mock<any, any, any>;
      updateJobStatus: jest.Mock<any, any, any>;
      updateJobVideoPath: jest.Mock<any, any, any>
    } = {
      getAllJobsByUser: jest.fn(),
      findJobById: jest.fn(),
      updateJobStatus: jest.fn(),
      updateJobVideoPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAllJobsUseCase,
        { provide: 'JobRepositoryPort', useValue: mockJobRepository },
      ],
    }).compile();

    useCase = module.get<ListAllJobsUseCase>(ListAllJobsUseCase);
    jobRepository = module.get('JobRepositoryPort');
  });

  describe('Dado o ListAllJobsUseCase', () => {
    describe('Quando executando com userId válido', () => {
      beforeEach(() => {
        jobRepository.getAllJobsByUser.mockResolvedValue(mockJobs);
      });

      it('Então deve retornar todos os jobs do usuário', async () => {
        const result = await useCase.execute('user-123');

        expect(result).toBe(mockJobs);
        expect(result).toHaveLength(3);
        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledWith('user-123');
        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledTimes(1);
      });

      it('Então deve retornar jobs com diferentes status', async () => {
        const result = await useCase.execute('user-123');

        expect(result[0].status).toBe(JobStatus.COMPLETED);
        expect(result[1].status).toBe(JobStatus.PENDING);
        expect(result[2].status).toBe(JobStatus.FAILED);
      });
    });

    describe('Quando o usuário não tem jobs', () => {
      beforeEach(() => {
        jobRepository.getAllJobsByUser.mockResolvedValue([]);
      });

      it('Então deve retornar array vazio', async () => {
        const result = await useCase.execute('user-without-jobs');

        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledWith('user-without-jobs');
      });
    });

    describe('Quando o usuário tem um único job', () => {
      const singleJob = [ProcessingJob.createProcessing('job-single', 'single.mp4', 'user-single')];

      beforeEach(() => {
        jobRepository.getAllJobsByUser.mockResolvedValue(singleJob);
      });

      it('Então deve retornar array com um job', async () => {
        const result = await useCase.execute('user-single');

        expect(result).toBe(singleJob);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe(JobStatus.PROCESSING);
      });
    });

    describe('Quando o repositório lança erro', () => {
      const repositoryError = new Error('Database connection timeout');

      beforeEach(() => {
        jobRepository.getAllJobsByUser.mockRejectedValue(repositoryError);
      });

      it('Então deve propagar o erro', async () => {
        await expect(useCase.execute('user-123')).rejects.toThrow('Database connection timeout');

        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledWith('user-123');
      });
    });

    describe('Quando chamado com userId vazio', () => {
      beforeEach(() => {
        jobRepository.getAllJobsByUser.mockResolvedValue([]);
      });

      it('Então deve passar string vazia para o repositório', async () => {
        const result = await useCase.execute('');

        expect(result).toEqual([]);
        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledWith('');
      });
    });

    describe('Quando chamado múltiplas vezes com o mesmo userId', () => {
      beforeEach(() => {
        jobRepository.getAllJobsByUser.mockResolvedValue(mockJobs);
      });

      it('Então deve chamar o repositório cada vez', async () => {
        await useCase.execute('user-123');
        await useCase.execute('user-123');

        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledTimes(2);
        expect(jobRepository.getAllJobsByUser).toHaveBeenNthCalledWith(1, 'user-123');
        expect(jobRepository.getAllJobsByUser).toHaveBeenNthCalledWith(2, 'user-123');
      });
    });

    describe('Quando chamado com diferentes userIds', () => {
      beforeEach(() => {
        jobRepository.getAllJobsByUser
            .mockResolvedValueOnce([mockJobs[0]])
            .mockResolvedValueOnce([mockJobs[1], mockJobs[2]]);
      });

      it('Então deve retornar resultados diferentes para usuários diferentes', async () => {
        const result1 = await useCase.execute('user-1');
        const result2 = await useCase.execute('user-2');

        expect(result1).toHaveLength(1);
        expect(result2).toHaveLength(2);
        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledWith('user-1');
        expect(jobRepository.getAllJobsByUser).toHaveBeenCalledWith('user-2');
      });
    });

    describe('Quando o repositório retorna grande número de jobs', () => {
      const manyJobs = Array.from({ length: 100 }, (_, i) =>
          ProcessingJob.createCompleted(`job-${i}`, `video${i}.mp4`, 'user-many', 50, `frames${i}.zip`)
      );

      beforeEach(() => {
        jobRepository.getAllJobsByUser.mockResolvedValue(manyJobs);
      });

      it('Então deve retornar todos os jobs sem modificação', async () => {
        const result = await useCase.execute('user-many');

        expect(result).toBe(manyJobs);
        expect(result).toHaveLength(100);
      });
    });
  });
});