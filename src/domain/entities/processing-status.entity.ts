import { ApiProperty } from '@nestjs/swagger';

export enum ProcessingStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export class ProcessingJob {
    @ApiProperty({
        description: 'ID único do job de processamento',
        example: '2025-06-28T16-43-36-099Z'
    })
    public readonly id: string;

    @ApiProperty({
        description: 'Nome original do arquivo',
        example: 'video.mp4'
    })
    public readonly originalName: string;

    @ApiProperty({
        description: 'Status atual do processamento',
        enum: ProcessingStatus,
        example: ProcessingStatus.PENDING
    })
    public readonly status: ProcessingStatus;

    @ApiProperty({
        description: 'Mensagem do status atual',
        example: 'Vídeo adicionado à fila de processamento'
    })
    public readonly message: string;

    @ApiProperty({
        description: 'Timestamp de criação',
        example: '2025-06-28T16:43:36.099Z'
    })
    public readonly createdAt: Date;

    constructor(
        id: string,
        originalName: string,
        status: ProcessingStatus,
        message: string,
        createdAt?: Date
    ) {
        this.id = id;
        this.originalName = originalName;
        this.status = status;
        this.message = message;
        this.createdAt = createdAt || new Date();
    }
}