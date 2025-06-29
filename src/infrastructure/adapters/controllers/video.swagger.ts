import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProcessingJob } from '../../../domain/entities/processing-job.entity';

export const VideoSwaggerTags = () =>
  applyDecorators(ApiTags('Video Processing'), ApiBearerAuth('JWT-auth'));

export const UploadVideoSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Upload de vídeo para processamento' }),
    ApiConsumes('multipart/form-data'),
    ApiResponse({
      status: 200,
      description: 'Upload realizado com sucesso',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Upload realizado com sucesso' },
          jobId: {
            type: 'string',
            example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Arquivo inválido ou erro no upload',
    }),
    ApiResponse({
      status: 401,
      description: 'Token de autenticação inválido',
    }),
  );

export const GetJobStatusSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Verificar status do job',
      description: 'Retorna apenas jobs que pertencem ao usuário autenticado',
    }),
    ApiParam({
      name: 'jobId',
      description: 'ID do job de processamento',
      example: '2025-06-28T16-43-36-099Z',
    }),
    ApiResponse({
      status: 200,
      description: 'Status do job retornado com sucesso',
      type: ProcessingJob,
    }),
    ApiResponse({
      status: 404,
      description: 'Job não encontrado ou não pertence ao usuário',
    }),
    ApiResponse({
      status: 401,
      description: 'Token de autenticação inválido',
    }),
  );

export const DownloadFileSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Download do arquivo processado' }),
    ApiParam({
      name: 'filename',
      description: 'Nome do arquivo ZIP (UUID.zip)',
      example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef.zip',
    }),
    ApiResponse({
      status: 200,
      description: 'Arquivo baixado com sucesso',
      headers: {
        'Content-Disposition': {
          description: 'attachment; filename=arquivo.zip',
        },
        'Content-Type': {
          description: 'application/zip',
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Arquivo não encontrado ou não pertence ao usuário',
    }),
    ApiResponse({
      status: 404,
      description: 'Arquivo físico não encontrado',
    }),
    ApiResponse({
      status: 401,
      description: 'Token de autenticação inválido',
    }),
  );

export const GetStatusSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Listar todos os jobs do usuário',
      description:
        'Retorna todos os jobs (pending, processing, completed, failed) com informações detalhadas',
    }),
    ApiResponse({
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
    }),
    ApiResponse({
      status: 401,
      description: 'Token de autenticação inválido',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
