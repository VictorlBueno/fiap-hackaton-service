import { ApiProperty } from '@nestjs/swagger';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class ProcessingJob {
  @ApiProperty({
    description: 'ID único do job',
    example: '2025-06-28T16-43-36-099Z',
  })
  public readonly id: string;

  @ApiProperty({ description: 'Nome original do vídeo', example: 'video.mp4' })
  public readonly videoName: string;

  @ApiProperty({ description: 'Status do processamento', enum: JobStatus })
  public readonly status: JobStatus;

  @ApiProperty({
    description: 'Mensagem do status',
    example: 'Processando vídeo...',
  })
  public readonly message: string;

  @ApiProperty({
    description: 'ID do usuário proprietário',
    example: 'user-123',
  })
  public readonly userId: string;

  @ApiProperty({ description: 'Número de frames extraídos', required: false })
  public readonly frameCount?: number;

  @ApiProperty({ description: 'Nome do arquivo ZIP gerado', required: false })
  public readonly zipPath?: string;

  @ApiProperty({ description: 'Data de criação' })
  public readonly createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  public readonly updatedAt?: Date;

  constructor(
    id: string,
    videoName: string,
    status: JobStatus,
    message: string,
    userId: string,
    frameCount?: number,
    zipPath?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id;
    this.videoName = videoName;
    this.status = status;
    this.message = message;
    this.userId = userId;
    this.frameCount = frameCount;
    this.zipPath = zipPath;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt;
  }

  // Factory methods permanecem iguais...
  static createPending(
    id: string,
    videoName: string,
    userId: string,
  ): ProcessingJob {
    return new ProcessingJob(
      id,
      videoName,
      JobStatus.PENDING,
      'Vídeo adicionado à fila de processamento',
      userId,
    );
  }

  static createProcessing(
    id: string,
    videoName: string,
    userId: string,
  ): ProcessingJob {
    return new ProcessingJob(
      id,
      videoName,
      JobStatus.PROCESSING,
      'Processando vídeo e extraindo frames...',
      userId,
    );
  }

  static createCompleted(
    id: string,
    videoName: string,
    userId: string,
    frameCount: number,
    zipPath: string,
  ): ProcessingJob {
    return new ProcessingJob(
      id,
      videoName,
      JobStatus.COMPLETED,
      `Processamento concluído! ${frameCount} frames extraídos.`,
      userId,
      frameCount,
      zipPath,
    );
  }

  static createFailed(
    id: string,
    videoName: string,
    userId: string,
    error: string,
  ): ProcessingJob {
    return new ProcessingJob(
      id,
      videoName,
      JobStatus.FAILED,
      `Falha no processamento: ${error}`,
      userId,
    );
  }

  isCompleted(): boolean {
    return this.status === JobStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === JobStatus.FAILED;
  }

  canDownload(): boolean {
    return this.isCompleted() && !!this.zipPath;
  }
}
