import { RedisJobRepositoryAdapter } from '../../redis.adapter';
import { ProcessingJob, JobStatus } from '../../../../../domain/entities/processing-job.entity';

const redisMockInstance = {
  set: jest.fn(),
  get: jest.fn(),
  sadd: jest.fn(),
  smembers: jest.fn(),
  del: jest.fn(),
  srem: jest.fn(),
};

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn(() => redisMockInstance),
  };
});

describe('RedisJobRepositoryAdapter', () => {
  let adapter: RedisJobRepositoryAdapter;
  let redisMock: any;

  beforeEach(() => {
    for (const fn of Object.values(redisMockInstance)) {
      if (typeof fn === 'function') (fn as jest.Mock).mockReset();
    }
    adapter = new RedisJobRepositoryAdapter();
    redisMock = (adapter as any).redis;
  });

  describe('When saving a pending job', () => {
    it('should store the job in Redis', async () => {
      const job = ProcessingJob.createPending('id1', 'video.mp4', 'user1');
      await adapter.saveJob(job);
      expect(redisMock.set).toHaveBeenCalled();
      expect(redisMock.sadd).toHaveBeenCalled();
    });
  });

  describe('When finding a job by id', () => {
    it('should return the job if it exists', async () => {
      const job = ProcessingJob.createPending('id2', 'video2.mp4', 'user2');
      redisMock.get.mockResolvedValueOnce(JSON.stringify(job));
      const result = await adapter.findJobById('id2', 'user2');
      expect(result).toBeInstanceOf(ProcessingJob);
      expect(result?.id).toBe('id2');
    });
    it('should return null if job does not exist', async () => {
      redisMock.get.mockResolvedValueOnce(null);
      const result = await adapter.findJobById('id3', 'user3');
      expect(result).toBeNull();
    });
  });

  describe('When updating job status', () => {
    it('should update the job in Redis', async () => {
      const job = ProcessingJob.createPending('id6', 'video6.mp4', 'user6');
      redisMock.get.mockResolvedValueOnce(JSON.stringify(job));
      await adapter.updateJobStatus('id6', JobStatus.PROCESSING, 'Processing...', { userId: 'user6' });
      expect(redisMock.set).toHaveBeenCalled();
    });
    it('should do nothing if job does not exist', async () => {
      redisMock.get.mockResolvedValueOnce(null);
      await expect(adapter.updateJobStatus('id7', JobStatus.PROCESSING, 'Processing...', { userId: 'user7' })).resolves.toBeUndefined();
    });
  });

  describe('When removing a job', () => {
    it('should remove the job from Redis', async () => {
      await adapter.removeJob('id8', 'user8');
      expect(redisMock.del).toHaveBeenCalled();
      expect(redisMock.srem).toHaveBeenCalled();
    });
  });
}); 