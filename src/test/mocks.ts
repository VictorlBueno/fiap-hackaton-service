export const mockMetricsService = {
  incrementVideoUpload: jest.fn(),
  recordVideoProcessingDuration: jest.fn(),
  setActiveJobs: jest.fn(),
  setProcessingJobs: jest.fn(),
  incrementHttpRequest: jest.fn(),
  recordHttpRequestDuration: jest.fn(),
  getMetrics: jest.fn().mockResolvedValue(''),
  resetMetrics: jest.fn(),
}; 