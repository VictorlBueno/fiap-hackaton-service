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

describe('Adaptador de Repositório Redis', () => {
  let adapter: RedisJobRepositoryAdapter;
  let redisMock: any;

  beforeEach(() => {
    for (const fn of Object.values(redisMockInstance)) {
      if (typeof fn === 'function') (fn as jest.Mock).mockReset();
    }
    adapter = new RedisJobRepositoryAdapter();
    redisMock = (adapter as any).redis;
  });

  describe('Quando salvando um job pendente', () => {
    it('deve armazenar o job no Redis', async () => {
      const job = ProcessingJob.createPending('id1', 'video.mp4', 'user1');
      await adapter.saveJob(job);
      expect(redisMock.set).toHaveBeenCalled();
      expect(redisMock.sadd).toHaveBeenCalled();
    });
  });

  describe('Quando encontrando um job por id', () => {
    it('deve retornar o job se ele existir', async () => {
      const job = ProcessingJob.createPending('id2', 'video2.mp4', 'user2');
      redisMock.get.mockResolvedValueOnce(JSON.stringify(job));
      const result = await adapter.findJobById('id2', 'user2');
      expect(result).toBeInstanceOf(ProcessingJob);
      expect(result?.id).toBe('id2');
    });
    it('deve retornar null se o job não existir', async () => {
      redisMock.get.mockResolvedValueOnce(null);
      const result = await adapter.findJobById('id3', 'user3');
      expect(result).toBeNull();
    });
  });

  describe('Quando atualizando status do job', () => {
    it('deve atualizar o job no Redis', async () => {
      const job = ProcessingJob.createPending('id6', 'video6.mp4', 'user6');
      redisMock.get.mockResolvedValueOnce(JSON.stringify(job));
      await adapter.updateJobStatus('id6', JobStatus.PROCESSING, 'Processing...', { userId: 'user6' });
      expect(redisMock.set).toHaveBeenCalled();
    });
    it('deve não fazer nada se o job não existir', async () => {
      redisMock.get.mockResolvedValueOnce(null);
      await expect(adapter.updateJobStatus('id7', JobStatus.PROCESSING, 'Processing...', { userId: 'user7' })).resolves.toBeUndefined();
    });
  });

  describe('Quando removendo um job', () => {
    it('deve remover o job do Redis', async () => {
      await adapter.removeJob('id8', 'user8');
      expect(redisMock.del).toHaveBeenCalled();
      expect(redisMock.srem).toHaveBeenCalled();
    });
  });
}); 