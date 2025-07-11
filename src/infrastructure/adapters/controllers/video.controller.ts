import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { UploadResponse } from '../../../application/ports/controllers/video-upload.port';
import { UploadVideoUseCase } from '../../../application/usecases/upload-video.usecase';
import { GetJobStatusUseCase } from '../../../application/usecases/get-job-status.usecase';
import { ListAllJobsUseCase } from '../../../application/usecases/list-all-job-usecase';
import { AuthenticatedRequest } from '../../middleware/jwt-auth.middleware';
import Format from '../utils/format';
import { FileStoragePort } from '../../../domain/ports/gateways/file-storage.port';
import { MetricsService } from '../services/metrics.service';
import {
  DownloadFileSwagger,
  GetJobStatusSwagger,
  GetStatusSwagger,
  UploadVideoSwagger,
  VideoSwaggerTags,
} from './video.swagger';

@VideoSwaggerTags()
@Controller()
export class VideoController {
  constructor(
    private readonly uploadVideoUseCase: UploadVideoUseCase,
    private readonly getJobStatusUseCase: GetJobStatusUseCase,
    private readonly listAllJobsUseCase: ListAllJobsUseCase,
    @Inject('FileStoragePort') private readonly fileStorage: FileStoragePort,
    private readonly metricsService: MetricsService,
  ) {}

  @Post('upload')
  @UploadVideoSwagger()
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: 'uploads',
        filename: (req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          cb(null, `${timestamp}_${file.originalname}`);
        },
      }),
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<UploadResponse> {
    try {
      console.log(`📤 Upload do usuário: ${req.userId} (${req.userEmail})`);
      
      // Registrar métrica de upload
      this.metricsService.incrementVideoUpload('started', req.userId);
      
      const result = await this.uploadVideoUseCase.execute(file, req.userId, req.userEmail);
      
      // Registrar métrica de sucesso/falha
      if (result.success) {
        this.metricsService.incrementVideoUpload('success', req.userId);
      } else {
        this.metricsService.incrementVideoUpload('failed', req.userId);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erro no upload:', error.message);
      
      // Registrar métrica de erro
      this.metricsService.incrementVideoUpload('error', req.userId);
      
      return {
        success: false,
        message: `Erro interno: ${error.message}`,
      };
    }
  }

  @Get('api/job/:jobId')
  @GetJobStatusSwagger()
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const job = await this.getJobStatusUseCase.execute(jobId, req.userId);

    if (!job) {
      return { error: 'Job não encontrado ou não pertence ao usuário' };
    }

    return {
      id: job.id,
      videoName: job.videoName,
      status: job.status,
      message: job.message,
      frameCount: job.frameCount,
      zipFilename: job.zipPath,
      downloadUrl:
        job.status === 'completed' && job.zipPath
          ? `/download/${job.zipPath}`
          : null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt ? job.updatedAt.toISOString() : job.createdAt.toISOString(),
      duration: Format.formatDuration(job.updatedAt || job.createdAt),
      canDownload: job.status === 'completed' && !!job.zipPath,
    };
  }

  @Get('download/:filename')
  @DownloadFileSwagger()
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    const jobId = filename.replace('.zip', '');
    const job = await this.getJobStatusUseCase.execute(jobId, req.userId);

    if (!job || job.status !== 'completed') {
      return res.status(HttpStatus.FORBIDDEN).json({
        error: 'Arquivo não encontrado ou não pertence ao usuário',
      });
    }

    try {
      const s3Key = `outputs/${filename}`;
      const fileStream = await this.fileStorage.getFileStream(s3Key);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Erro ao baixar arquivo do S3:', error.message);
      res.status(HttpStatus.NOT_FOUND).json({ error: 'Erro ao baixar arquivo do S3' });
    }
  }

  @Get('health')
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('api/status')
  @GetStatusSwagger()
  async getStatus(@Req() req: AuthenticatedRequest) {
    try {
      console.log(`Listando jobs do usuário: ${req.userId}`);

      const jobs = await this.listAllJobsUseCase.execute(req.userId);

      const summary = this.calculateSummary(jobs);
      const formattedJobs = Format.formatJobs(jobs);

      // Atualizar métricas de jobs
      this.metricsService.setActiveJobs('pending', summary.pending);
      this.metricsService.setActiveJobs('processing', summary.processing);
      this.metricsService.setActiveJobs('completed', summary.completed);
      this.metricsService.setActiveJobs('failed', summary.failed);
      this.metricsService.setProcessingJobs(summary.processing);

      return {
        jobs: formattedJobs,
        summary,
        userId: req.userId,
      };
    } catch (error) {
      console.error('❌ Erro ao listar jobs:', error.message);
      return this.getErrorResponse(req.userId);
    }
  }

  private calculateSummary(jobs: any[]) {
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      totalFrames: jobs
        .filter((j) => j.frameCount)
        .reduce((sum, j) => sum + (j.frameCount || 0), 0),
    };
  }

  private getErrorResponse(userId: string) {
    return {
      error: 'Erro ao listar jobs',
      jobs: [],
      summary: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        totalFrames: 0,
      },
      userId,
    };
  }
}
