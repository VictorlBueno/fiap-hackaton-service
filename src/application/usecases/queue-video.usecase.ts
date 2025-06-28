import {Injectable} from '@nestjs/common';
import {RabbitMQService, VideoProcessingMessage} from '../../infrastructure/services/rabbitmq.service';
import {QueueResponse} from "../../domain/entities/queue-response.entity";

@Injectable()
export class QueueVideoUseCase {
    constructor(
        private readonly rabbitMQService: RabbitMQService,
    ) {
    }

    async execute(videoPath: string, originalName: string, timestamp: string): Promise<QueueResponse> {
        const message: VideoProcessingMessage = {
            id: timestamp,
            videoPath,
            timestamp,
            originalName,
        };

        const success = await this.rabbitMQService.sendToQueue(message);

        if (success) {
            return new QueueResponse(
                true,
                'Vídeo adicionado à fila de processamento com sucesso! Aguarde alguns minutos.',
                timestamp,
                `/api/job/${timestamp}`
            );
        } else {
            return new QueueResponse(
                false,
                'Erro ao adicionar vídeo à fila. Tente novamente.',
                timestamp,
                ''
            );
        }
    }
}