import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { ProcessingJob } from '../../../domain/entities/processing-job.entity';
import { UploadResponse } from '../../../application/ports/controllers/video-upload.port';
import * as path from 'path';
import * as fs from 'fs/promises';
import { UploadVideoUseCase } from '../../../application/usecases/upload-video.usecase';
import { GetJobStatusUseCase } from '../../../application/usecases/get-job-status.usecase';
import { AuthenticatedRequest } from '../../middleware/jwt-auth.middleware';
import { ListAllJobsUseCase } from '../../../application/usecases/list-all-job-usecase';

@ApiTags('Video Processing')
@ApiBearerAuth('JWT-auth')
@Controller()
export class VideoController {
  constructor(
    private readonly uploadVideoUseCase: UploadVideoUseCase,
    private readonly getJobStatusUseCase: GetJobStatusUseCase,
    private readonly listAllJobsUseCase: ListAllJobsUseCase,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload de vídeo para processamento' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Upload realizado com sucesso' })
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
      const userId = req.userId || 'anonymous-user';
      console.log(`📤 Upload do usuário: ${userId}`);

      return await this.uploadVideoUseCase.execute(file, userId);
    } catch (error) {
      console.error('❌ Erro no upload:', error.message);
      return {
        success: false,
        message: `Erro interno: ${error.message}`,
      };
    }
  }

  @Get('api/job/:jobId')
  @ApiOperation({
    summary: 'Verificar status do job',
    description: 'Retorna apenas jobs que pertencem ao usuário autenticado',
  })
  @ApiParam({
    name: 'jobId',
    description: 'ID do job de processamento',
    example: '2025-06-28T16-43-36-099Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do job retornado com sucesso',
    type: ProcessingJob,
  })
  @ApiResponse({
    status: 404,
    description: 'Job não encontrado ou não pertence ao usuário',
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.userId || 'anonymous-user';
    const job = await this.getJobStatusUseCase.execute(jobId, userId);

    if (!job) {
      return { error: 'Job não encontrado ou não pertence ao usuário' };
    }

    return job;
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download do arquivo processado' })
  @ApiParam({
    name: 'filename',
    description: 'Nome do arquivo ZIP (UUID.zip)',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef.zip',
  })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.userId || 'anonymous-user';

    // Extrair UUID do filename
    const jobId = filename.replace('.zip', '');

    // Verificar no banco se o arquivo pertence ao usuário
    const job = await this.getJobStatusUseCase.execute(jobId, userId);

    if (!job || job.status !== 'completed') {
      return res.status(HttpStatus.FORBIDDEN).json({
        error: 'Arquivo não encontrado ou não pertence ao usuário',
      });
    }

    const filePath = path.join('outputs', filename);

    try {
      await fs.access(filePath);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/zip');
      res.sendFile(path.resolve(filePath));
    } catch {
      res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: 'Arquivo físico não encontrado' });
    }
  }

  @Get('api/status')
  @ApiOperation({
    summary: 'Listar todos os jobs do usuário',
    description:
      'Retorna todos os jobs (pending, processing, completed, failed) com informações detalhadas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de jobs do usuário',
    schema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
              },
              videoName: { type: 'string', example: 'meu_video.mp4' },
              status: {
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'failed'],
                example: 'completed',
              },
              message: {
                type: 'string',
                example: 'Processamento concluído! 120 frames extraídos.',
              },
              frameCount: { type: 'number', example: 120, nullable: true },
              zipFilename: {
                type: 'string',
                example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef.zip',
                nullable: true,
              },
              downloadUrl: {
                type: 'string',
                example: '/download/a1b2c3d4-e5f6-7890-1234-567890abcdef.zip',
                nullable: true,
              },
              createdAt: {
                type: 'string',
                example: '2025-06-29T16:43:36.099Z',
              },
              updatedAt: {
                type: 'string',
                example: '2025-06-29T16:45:12.543Z',
              },
              duration: { type: 'string', example: '2 minutos atrás' },
              canDownload: { type: 'boolean', example: true },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 15 },
            pending: { type: 'number', example: 2 },
            processing: { type: 'number', example: 1 },
            completed: { type: 'number', example: 10 },
            failed: { type: 'number', example: 2 },
            totalFrames: { type: 'number', example: 1250 },
          },
        },
        userId: {
          type: 'string',
          example: '54282418-a061-70d7-e35a-5d5603eaeb4c',
        },
      },
    },
  })
  async getStatus(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.userId || 'anonymous-user';
      console.log(`📋 Listando jobs completos do usuário: ${userId}`);

      const jobs = await this.listAllJobsUseCase.execute(userId);

      // Calcular estatísticas
      const summary = {
        total: jobs.length,
        pending: jobs.filter((j) => j.status === 'pending').length,
        processing: jobs.filter((j) => j.status === 'processing').length,
        completed: jobs.filter((j) => j.status === 'completed').length,
        failed: jobs.filter((j) => j.status === 'failed').length,
        totalFrames: jobs
          .filter((j) => j.frameCount)
          .reduce((sum, j) => sum + (j.frameCount || 0), 0),
      };

      // Formatar jobs para resposta
      const formattedJobs = jobs.map((job) => ({
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
        updatedAt: job.createdAt.toISOString(), // Assumindo que não temos updatedAt na entidade ainda
        duration: this.formatDuration(job.createdAt),
        canDownload: job.status === 'completed' && !!job.zipPath,
      }));

      return {
        jobs: formattedJobs,
        summary,
        userId,
      };
    } catch (error) {
      console.error('❌ Erro ao listar jobs:', error.message);
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
        userId: req.userId || 'anonymous-user',
      };
    }
  }

  private formatDuration(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
    } else if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} atrás`;
    } else {
      return 'Agora mesmo';
    }
  }
}
