import {Inject, Injectable, OnModuleInit} from '@nestjs/common';
import {Video} from '../../../domain/entities/video.entity';
import {QueueMessage, QueuePort} from "../../../domain/ports/gateways/queue.port";
import {VideoProcessingService} from "../../../domain/service/video-processing.service";

@Injectable()
export class QueueProcessorAdapter implements OnModuleInit {
    constructor(
        @Inject('QueuePort') private readonly queue: QueuePort,
        private readonly videoProcessingService: VideoProcessingService,
    ) {
    }

    async onModuleInit() {
        setTimeout(async () => {
            await this.startProcessing();
        }, 2000);
    }

    private async startProcessing() {
        try {
            await this.queue.consumeMessages(this.processMessage.bind(this));
        } catch (error) {
            console.log('RabbitMQ não disponível para processamento, tentando novamente em 5 segundos...');
            setTimeout(() => this.startProcessing(), 5000);
        }
    }

    private async processMessage(message: QueueMessage): Promise<void> {
        try {
            const video = new Video(
                message.id,
                message.videoName,
                message.videoPath,
                0,
                message.userId,
                new Date()
            );

            const result = await this.videoProcessingService.processVideo(video, message.userId);

            if (result?.isFailed()) {
                console.error(`Processamento falhou para usuário ${message.userId}: ${message.id} - ${result.message}`);
            }

        } catch (error) {
            console.error(`Erro crítico no processamento para usuário ${message.userId}: ${message.id}`, error.message);
            throw error;
        }
    }
}