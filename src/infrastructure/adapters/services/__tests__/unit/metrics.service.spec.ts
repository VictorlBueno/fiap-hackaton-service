import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../../metrics.service';

jest.mock('prom-client', () => {
  const mCounter = jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
    reset: jest.fn(),
    set: jest.fn(),
    observe: jest.fn(),
  }));
  const mHistogram = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    reset: jest.fn(),
  }));
  const mGauge = jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    reset: jest.fn(),
  }));
  return {
    Counter: mCounter,
    Histogram: mHistogram,
    Gauge: mGauge,
    register: {
      metrics: jest.fn().mockResolvedValue('mocked_metrics'),
      clear: jest.fn(),
    },
  };
});

import { register, Counter, Histogram, Gauge } from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();
    service = module.get<MetricsService>(MetricsService);
  });

  it('deve instanciar métricas corretamente', () => {
    expect(Counter).toHaveBeenCalled();
    expect(Histogram).toHaveBeenCalled();
    expect(Gauge).toHaveBeenCalled();
  });

  it('incrementHttpRequest chama inc do Counter', () => {
    service.incrementHttpRequest('GET', '/api/test', 200);
    const instance = (Counter as jest.Mock).mock.results[0].value;
    expect(instance.inc).toHaveBeenCalledWith({ method: 'GET', path: '/api/test', status: '200' });
  });

  it('recordHttpRequestDuration chama observe do Histogram', () => {
    service.recordHttpRequestDuration('POST', '/api/test', 1.23);
    const instance = (Histogram as jest.Mock).mock.results[0].value;
    expect(instance.observe).toHaveBeenCalledWith({ method: 'POST', path: '/api/test' }, 1.23);
  });

  it('incrementVideoUpload chama inc do Counter com userId', () => {
    service.incrementVideoUpload('success', 'user1');
    const instance = (Counter as jest.Mock).mock.results[1].value;
    expect(instance.inc).toHaveBeenCalledWith({ status: 'success', user_id: 'user1' });
  });

  it('incrementVideoUpload chama inc do Counter com anonymous', () => {
    service.incrementVideoUpload('failed');
    const instance = (Counter as jest.Mock).mock.results[1].value;
    expect(instance.inc).toHaveBeenCalledWith({ status: 'failed', user_id: 'anonymous' });
  });

  it('recordVideoProcessingDuration chama observe do Histogram', () => {
    service.recordVideoProcessingDuration('completed', 'mp4', 10);
    const instance = (Histogram as jest.Mock).mock.results[1].value;
    expect(instance.observe).toHaveBeenCalledWith({ status: 'completed', video_format: 'mp4' }, 10);
  });

  it('setActiveJobs chama set do Gauge', () => {
    service.setActiveJobs('processing', 5);
    const instance = (Gauge as jest.Mock).mock.results[0].value;
    expect(instance.set).toHaveBeenCalledWith({ status: 'processing' }, 5);
  });

  it('setProcessingJobs chama set do Gauge', () => {
    service.setProcessingJobs(3);
    const instance = (Gauge as jest.Mock).mock.results[1].value;
    expect(instance.set).toHaveBeenCalledWith(3);
  });

  it('getMetrics retorna métricas do register', async () => {
    const result = await service.getMetrics();
    expect(register.metrics).toHaveBeenCalled();
    expect(result).toBe('mocked_metrics');
  });

  it('resetMetrics chama clear e reinicializa métricas', () => {
    const counterCallsBefore = (Counter as jest.Mock).mock.calls.length;
    const histogramCallsBefore = (Histogram as jest.Mock).mock.calls.length;
    const gaugeCallsBefore = (Gauge as jest.Mock).mock.calls.length;

    service.resetMetrics();
    expect(register.clear).toHaveBeenCalled();
    expect((Counter as jest.Mock).mock.calls.length).toBe(counterCallsBefore + 2); // HTTP + Video
    expect((Histogram as jest.Mock).mock.calls.length).toBe(histogramCallsBefore + 2); // HTTP + Video
    expect((Gauge as jest.Mock).mock.calls.length).toBe(gaugeCallsBefore + 2); // Active + Processing
  });
}); 