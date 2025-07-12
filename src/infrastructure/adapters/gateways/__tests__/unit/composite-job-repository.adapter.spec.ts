import { CompositeJobRepositoryAdapter } from '../../composite-job-repository.adapter';
import { JobStatus, ProcessingJob } from '../../../../../domain/entities/processing-job.entity';

describe('CompositeJobRepositoryAdapter', () => {
  let adapter: CompositeJobRepositoryAdapter;
  let redisRepo: any;
  let postgresRepo: any;

  beforeEach(() => {
    redisRepo = {
      saveJob: jest.fn(),
      findJobById: jest.fn(),
      getAllJobsByUser: jest.fn(),
      updateJobStatus: jest.fn(),
      updateJobVideoPath: jest.fn(),
      removeJob: jest.fn(),
    };
    postgresRepo = {
      saveJob: jest.fn(),
      findJobById: jest.fn(),
      getAllJobsByUser: jest.fn(),
      updateJobStatus: jest.fn(),
      updateJobVideoPath: jest.fn(),
    };
    adapter = new CompositeJobRepositoryAdapter(redisRepo, postgresRepo);
  });

  describe('When saving a job', () => {
    it('should delegate to Redis for pending jobs', async () => {
      const job = ProcessingJob.createPending('id1', 'v1', 'user1');
      await adapter.saveJob(job);
      expect(redisRepo.saveJob).toHaveBeenCalledWith(job);
      expect(postgresRepo.saveJob).not.toHaveBeenCalled();
    });
    it('should delegate to Postgres for completed jobs', async () => {
      const job = ProcessingJob.createCompleted('id2', 'v2', 'user2', 10, 'z.zip');
      await adapter.saveJob(job);
      expect(postgresRepo.saveJob).toHaveBeenCalledWith(job);
      expect(redisRepo.saveJob).not.toHaveBeenCalled();
    });
  });

  describe('When finding a job by id', () => {
    it('should return from Redis if found', async () => {
      const job = ProcessingJob.createPending('id3', 'v3', 'user3');
      redisRepo.findJobById.mockResolvedValueOnce(job);
      const result = await adapter.findJobById('id3', 'user3');
      expect(result).toBe(job);
      expect(redisRepo.findJobById).toHaveBeenCalledWith('id3', 'user3');
      expect(postgresRepo.findJobById).not.toHaveBeenCalled();
    });
    it('should return from Postgres if not in Redis', async () => {
      redisRepo.findJobById.mockResolvedValueOnce(null);
      const job = ProcessingJob.createCompleted('id4', 'v4', 'user4', 5, 'z2.zip');
      postgresRepo.findJobById.mockResolvedValueOnce(job);
      const result = await adapter.findJobById('id4', 'user4');
      expect(result).toBe(job);
      expect(postgresRepo.findJobById).toHaveBeenCalledWith('id4', 'user4');
    });
  });

  describe('When getting all jobs by user', () => {
    it('should merge jobs from Redis and Postgres', async () => {
      const redisJobs = [ProcessingJob.createPending('id5', 'v5', 'user5')];
      const pgJobs = [ProcessingJob.createCompleted('id6', 'v6', 'user5', 1, 'z3.zip')];
      redisRepo.getAllJobsByUser.mockResolvedValueOnce(redisJobs);
      postgresRepo.getAllJobsByUser.mockResolvedValueOnce(pgJobs);
      const result = await adapter.getAllJobsByUser('user5');
      expect(result).toEqual([...pgJobs, ...redisJobs]);
    });
  });

  describe('When updating job status', () => {
    it('should move job from Redis to Postgres on completion', async () => {
      const job = ProcessingJob.createProcessing('id7', 'v7', 'user7');
      redisRepo.findJobById.mockResolvedValueOnce(job);
      postgresRepo.saveJob.mockResolvedValueOnce(undefined);
      redisRepo.removeJob.mockResolvedValueOnce(undefined);
      await adapter.updateJobStatus('id7', JobStatus.COMPLETED, 'done', { userId: 'user7' });
      expect(postgresRepo.saveJob).toHaveBeenCalled();
      expect(redisRepo.removeJob).toHaveBeenCalledWith('id7', 'user7');
    });
    it('should update in Postgres if not found in Redis', async () => {
      redisRepo.findJobById.mockResolvedValueOnce(null);
      await adapter.updateJobStatus('id8', JobStatus.COMPLETED, 'done', { userId: 'user8' });
      expect(postgresRepo.updateJobStatus).toHaveBeenCalledWith('id8', JobStatus.COMPLETED, 'done', { userId: 'user8' });
    });
    it('should update in Redis for processing status', async () => {
      await adapter.updateJobStatus('id9', JobStatus.PROCESSING, 'processing', { userId: 'user9' });
      expect(redisRepo.updateJobStatus).toHaveBeenCalledWith('id9', JobStatus.PROCESSING, 'processing', { userId: 'user9' });
    });
  });

  describe('When updating job video path', () => {
    it('should update in both repositories', async () => {
      await adapter.updateJobVideoPath('id10', 'path10');
      expect(redisRepo.updateJobVideoPath).toHaveBeenCalledWith('id10', 'path10');
      expect(postgresRepo.updateJobVideoPath).toHaveBeenCalledWith('id10', 'path10');
    });
  });
}); 