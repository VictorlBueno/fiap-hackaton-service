import {ApiProperty} from '@nestjs/swagger';

export class QueueResponse {
    @ApiProperty({
        description: 'Indica se o vídeo foi adicionado à fila com sucesso',
        example: true
    })
    public readonly success: boolean;

    @ApiProperty({
        description: 'Mensagem de resposta',
        example: 'Vídeo adicionado à fila de processamento com sucesso!'
    })
    public readonly message: string;

    @ApiProperty({
        description: 'ID do job para acompanhamento',
        example: '2025-06-28T16-43-36-099Z'
    })
    public readonly jobId: string;

    @ApiProperty({
        description: 'URL para acompanhar o status do processamento',
        example: '/api/job/2025-06-28T16-43-36-099Z'
    })
    public readonly statusUrl: string;

    constructor(
        success: boolean,
        message: string,
        jobId: string,
        statusUrl: string
    ) {
        this.success = success;
        this.message = message;
        this.jobId = jobId;
        this.statusUrl = statusUrl;
    }
}
