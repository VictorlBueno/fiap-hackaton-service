import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private videoUploadsTotal: Counter;
  private videoProcessingDuration: Histogram;
  private activeJobs: Gauge;
  private processingJobs: Gauge;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Métricas de HTTP
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total de requisições HTTP',
      labelNames: ['method', 'path', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duração das requisições HTTP',
      labelNames: ['method', 'path'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    // Métricas de vídeo
    this.videoUploadsTotal = new Counter({
      name: 'video_uploads_total',
      help: 'Total de uploads de vídeo',
      labelNames: ['status', 'user_id'],
    });

    this.videoProcessingDuration = new Histogram({
      name: 'video_processing_duration_seconds',
      help: 'Duração do processamento de vídeo',
      labelNames: ['status', 'video_format'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    });

    // Métricas de jobs
    this.activeJobs = new Gauge({
      name: 'jobs_active_total',
      help: 'Total de jobs ativos',
      labelNames: ['status'],
    });

    this.processingJobs = new Gauge({
      name: 'jobs_processing_total',
      help: 'Total de jobs em processamento',
    });
  }

  // Métricas de HTTP
  incrementHttpRequest(method: string, path: string, status: number) {
    this.httpRequestsTotal.inc({ method, path, status: status.toString() });
  }

  recordHttpRequestDuration(method: string, path: string, duration: number) {
    this.httpRequestDuration.observe({ method, path }, duration);
  }

  // Métricas de vídeo
  incrementVideoUpload(status: string, userId?: string) {
    this.videoUploadsTotal.inc({ status, user_id: userId || 'anonymous' });
  }

  recordVideoProcessingDuration(status: string, format: string, duration: number) {
    this.videoProcessingDuration.observe({ status, video_format: format }, duration);
  }

  // Métricas de jobs
  setActiveJobs(status: string, count: number) {
    this.activeJobs.set({ status }, count);
  }

  setProcessingJobs(count: number) {
    this.processingJobs.set(count);
  }

  // Obter métricas em formato Prometheus
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Reset métricas (útil para testes)
  resetMetrics() {
    register.clear();
    this.initializeMetrics();
  }
} 