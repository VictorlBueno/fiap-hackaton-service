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
  private _videoName: string;

  @ApiProperty({ description: 'Status do processamento', enum: JobStatus })
  private _status: JobStatus;

  @ApiProperty({
    description: 'Mensagem do status',
    example: 'Processando vídeo...',
  })
  private _message: string;

  @ApiProperty({
    description: 'ID do usuário proprietário',
    example: 'user-123',
  })
  private _userId: string;

  @ApiProperty({ description: 'Número de frames extraídos', required: false })
  private _frameCount?: number;

  @ApiProperty({ description: 'Nome do arquivo ZIP gerado', required: false })
  private _zipPath?: string;

  @ApiProperty({ description: 'Data de criação' })
  private _createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  private _updatedAt?: Date;

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
    this._videoName = videoName;
    this._status = status;
    this._message = message;
    this._userId = userId;
    this._frameCount = frameCount;
    this._zipPath = zipPath;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt;
  }

  get videoName(): string {
    return this._videoName;
  }
  set videoName(value: string) {
    this._videoName = value;
  }

  get status(): JobStatus {
    return this._status;
  }
  set status(value: JobStatus) {
    this._status = value;
  }

  get message(): string {
    return this._message;
  }
  set message(value: string) {
    this._message = value;
  }

  get userId(): string {
    return this._userId;
  }
  set userId(value: string) {
    this._userId = value;
  }

  get frameCount(): number | undefined {
    return this._frameCount;
  }
  set frameCount(value: number | undefined) {
    this._frameCount = value;
  }

  get zipPath(): string | undefined {
    return this._zipPath;
  }
  set zipPath(value: string | undefined) {
    this._zipPath = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
  set createdAt(value: Date) {
    this._createdAt = value;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
  set updatedAt(value: Date | undefined) {
    this._updatedAt = value;
  }

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

  toJSON() {
    return {
      id: this.id,
      videoName: this._videoName,
      status: this._status,
      message: this._message,
      userId: this._userId,
      frameCount: this._frameCount,
      zipPath: this._zipPath,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
