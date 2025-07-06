import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { PostgresJobRepositoryAdapter } from '../../file-job-repository.adapter';
import {
  JobStatus,
  ProcessingJob,
} from '../../../../../domain/entities/processing-job.entity';

jest.mock('../../../../config/database.config');

describe('PostgresJobRepositoryAdapter - Unit Tests', () => {
  let repository: PostgresJobRepositoryAdapter;
  let mockPool: jest.Mocked<Pick<Pool, 'query' | 'connect' | 'end'>>;

  const mockJob = ProcessingJob.createCompleted(
    'job-123',
    'video.mp4',
    'user-456',
    150,
    'frames.zip',
  );
  const mockPendingJob = ProcessingJob.createPending(
    'job-456',
    'video2.mp4',
    'user-789',
  );

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    };

    const { createDatabasePool } = require('../../../../config/database.config');
    createDatabasePool.mockReturnValue(mockPool as unknown as Pool);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PostgresJobRepositoryAdapter],
    }).compile();

    repository = module.get<PostgresJobRepositoryAdapter>(
      PostgresJobRepositoryAdapter,
    );

    jest.clearAllMocks();
  });

  describe('Given PostgresJobRepositoryAdapter', () => {
    describe('When saving a job', () => {
      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 });
      });

      it('Then should execute INSERT with UPSERT logic', async () => {
        await repository.saveJob(mockJob);

        expect(mockPool.query).toHaveBeenCalledTimes(1);
        const [query, values] = mockPool.query.mock.calls[0];

        expect(query).toContain('INSERT INTO processing_jobs');
        expect(query).toContain('ON CONFLICT (id) DO UPDATE SET');
        expect(values).toEqual([
          mockJob.id,
          mockJob.userId,
          mockJob.videoName,
          null,
          mockJob.status,
          mockJob.message,
          mockJob.frameCount,
          mockJob.zipPath,
          mockJob.createdAt,
        ]);
      });

      it('Then should handle job with null optional fields', async () => {
        await repository.saveJob(mockPendingJob);

        const [, values] = mockPool.query.mock.calls[0];
        expect(values[6]).toBeNull();
        expect(values[7]).toBeNull();
        expect(values[8]).toBe(mockPendingJob.createdAt);
      });
    });

    describe('When saving job fails', () => {
      const dbError = new Error('Database connection failed');

      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockRejectedValue(dbError);
      });

      it('Then should propagate the error', async () => {
        await expect(repository.saveJob(mockJob)).rejects.toThrow(
          'Database connection failed',
        );
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });
    });

    describe('When finding job by ID', () => {
      const mockRow = {
        id: 'job-123',
        user_id: 'user-456',
        video_name: 'video.mp4',
        status: 'completed',
        message: 'Success',
        frame_count: 150,
        zip_filename: 'frames.zip',
        created_at: new Date('2025-01-15T10:00:00Z'),
        updated_at: new Date('2025-01-15T11:00:00Z'),
      };

      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockResolvedValue({
          rows: [mockRow],
          rowCount: 1,
        });
      });

      it('Then should return ProcessingJob instance', async () => {
        const result = await repository.findJobById('job-123', 'user-456');

        expect(result).toBeInstanceOf(ProcessingJob);
        expect(result?.id).toBe('job-123');
        expect(result?.userId).toBe('user-456');
        expect(result?.videoName).toBe('video.mp4');
        expect(result?.status).toBe('completed');
        expect(result?.frameCount).toBe(150);
      });

      it('Then should use correct query parameters', async () => {
        await repository.findJobById('job-123', 'user-456');

        const [query, values] = mockPool.query.mock.calls[0];
        expect(query).toContain('WHERE id = $1 AND user_id = $2');
        expect(values).toEqual(['job-123', 'user-456']);
      });
    });

    describe('When job is not found', () => {
      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      });

      it('Then should return null', async () => {
        const result = await repository.findJobById('nonexistent', 'user-456');

        expect(result).toBeNull();
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });
    });

    describe('When finding job fails', () => {
      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockRejectedValue(new Error('Query failed'));
      });

      it('Then should return null and not throw', async () => {
        const result = await repository.findJobById('job-123', 'user-456');

        expect(result).toBeNull();
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });
    });

    describe('When getting all jobs by user', () => {
      const mockRows = [
        {
          id: 'job-1',
          user_id: 'user-123',
          video_name: 'video1.mp4',
          status: 'completed',
          message: 'Success',
          frame_count: 100,
          zip_filename: 'frames1.zip',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: null,
        },
        {
          id: 'job-2',
          user_id: 'user-123',
          video_name: 'video2.mp4',
          status: 'pending',
          message: 'Waiting',
          frame_count: null,
          zip_filename: null,
          created_at: new Date('2025-01-15T09:00:00Z'),
          updated_at: null,
        },
      ];

      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockResolvedValue({
          rows: mockRows,
          rowCount: 2,
        });
      });

      it('Then should return array of ProcessingJob instances', async () => {
        const result = await repository.getAllJobsByUser('user-123');

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(ProcessingJob);
        expect(result[1]).toBeInstanceOf(ProcessingJob);
        expect(result[0].id).toBe('job-1');
        expect(result[1].id).toBe('job-2');
      });

      it('Then should order by created_at DESC', async () => {
        await repository.getAllJobsByUser('user-123');

        const [query] = mockPool.query.mock.calls[0];
        expect(query).toContain('ORDER BY created_at DESC');
      });
    });

    describe('When getting all jobs fails', () => {
      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockRejectedValue(new Error('Database error'));
      });

      it('Then should return empty array', async () => {
        const result = await repository.getAllJobsByUser('user-123');

        expect(result).toEqual([]);
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });
    });

    describe('When updating job status', () => {
      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockResolvedValue({ rowCount: 1 });
      });

      it('Then should execute UPDATE with basic parameters', async () => {
        await repository.updateJobStatus(
          'job-123',
          JobStatus.COMPLETED,
          'Success',
        );

        const [query, values] = mockPool.query.mock.calls[0];
        expect(query).toContain('UPDATE processing_jobs');
        expect(query).toContain('SET status = $1, message = $2');
        expect(values).toEqual([
          JobStatus.COMPLETED,
          'Success',
          null,
          null,
          'job-123',
        ]);
      });

      it('Then should include additional data when provided', async () => {
        const additionalData = { frameCount: 200, zipPath: 'output.zip' };

        await repository.updateJobStatus(
          'job-123',
          JobStatus.COMPLETED,
          'Success',
          additionalData,
        );

        const [, values] = mockPool.query.mock.calls[0];
        expect(values[2]).toBe(200);
        expect(values[3]).toBe('output.zip');
      });
    });

    describe('When updating job status fails', () => {
      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockRejectedValue(new Error('Update failed'));
      });

      it('Then should propagate the error', async () => {
        await expect(
          repository.updateJobStatus('job-123', JobStatus.FAILED, 'Error'),
        ).rejects.toThrow('Update failed');
      });
    });

    describe('When updating job video path', () => {
      beforeEach(() => {
        // @ts-ignore
        return mockPool.query.mockResolvedValue({ rowCount: 1 });
      });

      it('Then should execute UPDATE with video path', async () => {
        await repository.updateJobVideoPath('job-123', '/uploads/video.mp4');

        const [query, values] = mockPool.query.mock.calls[0];
        expect(query).toContain(
          'UPDATE processing_jobs SET video_path = $1 WHERE id = $2',
        );
        expect(values).toEqual(['/uploads/video.mp4', 'job-123']);
      });
    });

    describe('When updating video path fails', () => {
      beforeEach(() => {
        return mockPool.query.mockRejectedValue(
          // @ts-ignore
          new Error('Path update failed'),
        );
      });

      it('Then should propagate the error', async () => {
        await expect(
          repository.updateJobVideoPath('job-123', '/path'),
        ).rejects.toThrow('Path update failed');
      });
    });


  });
});
