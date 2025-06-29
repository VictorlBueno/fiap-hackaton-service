import { Test, TestingModule } from '@nestjs/testing';
import { JobRepositoryPort } from '../../../../domain/ports/repositories/job-repository.port';
import {JobStatus, ProcessingJob} from '../../../../domain/entities/processing-job.entity';
import { GetJobStatusUseCase } from '../../get-job-status.usecase';

describe('GetJobStatusUseCase - Unit Tests', () => {
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

  describe('Given GetJobStatusUseCase', () => {
    describe('When executing with valid jobId and userId', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(mockJob);
      });

      it('Then should return the processing job', async () => {
        const result = await useCase.execute('job-123', 'user-456');

        expect(result).toBe(mockJob);
        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'job-123',
          'user-456',
        );
        expect(jobRepository.findJobById).toHaveBeenCalledTimes(1);
      });
    });

    describe('When job exists but belongs to different user', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Then should return null', async () => {
        const result = await useCase.execute('job-123', 'different-user');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'job-123',
          'different-user',
        );
      });
    });

    describe('When job does not exist', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Then should return null', async () => {
        const result = await useCase.execute('non-existent-job', 'user-456');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'non-existent-job',
          'user-456',
        );
      });
    });

    describe('When repository throws error', () => {
      const repositoryError = new Error('Database connection failed');

      beforeEach(() => {
        jobRepository.findJobById.mockRejectedValue(repositoryError);
      });

      it('Then should propagate the error', async () => {
        await expect(useCase.execute('job-123', 'user-456')).rejects.toThrow(
          'Database connection failed',
        );

        expect(jobRepository.findJobById).toHaveBeenCalledWith(
          'job-123',
          'user-456',
        );
      });
    });

    describe('When called with empty jobId', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Then should pass empty string to repository', async () => {
        const result = await useCase.execute('', 'user-456');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith('', 'user-456');
      });
    });

    describe('When called with empty userId', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(null);
      });

      it('Then should pass empty string to repository', async () => {
        const result = await useCase.execute('job-123', '');

        expect(result).toBeNull();
        expect(jobRepository.findJobById).toHaveBeenCalledWith('job-123', '');
      });
    });

    describe('When called multiple times with same parameters', () => {
      beforeEach(() => {
        jobRepository.findJobById.mockResolvedValue(mockJob);
      });

      it('Then should call repository each time', async () => {
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

    describe('When job has different statuses', () => {
      it('Then should return pending job correctly', async () => {
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

      it('Then should return failed job correctly', async () => {
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
