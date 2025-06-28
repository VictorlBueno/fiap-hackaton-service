import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { QueuePort, QueueMessage } from '../../../domain/ports/gateways/queue.port';
import { Video } from '../../../domain/entities/video.entity';
import {VideoProcessingService} from "../../../domain/service/video-processing.service";

@Injectable()
export class QueueProcessorAdapter implements OnModuleInit {
    constructor(
        @Inject('QueuePort') private readonly queue: QueuePort,
        private readonly videoProcessingService: VideoProcessingService,
    ) {}

    async onModuleInit() {
        console.log('🎯 Iniciando processador de fila...');

        setTimeout(async () => {
            await this.startProcessing();
        }, 2000);
    }

    private async startProcessing() {
        try {
            await this.queue.consumeMessages(this.processMessage.bind(this));
            console.log('✅ Processador de fila iniciado');
        } catch (error) {
            console.error('❌ Erro no processador:', error.message);
            setTimeout(() => this.startProcessing(), 5000);
        }
    }

    private async processMessage(message: QueueMessage): Promise<void> {
        console.log(`🎬 Processando vídeo: ${message.videoName}`);

        const video = new Video(message.id, message.videoName, message.videoPath, 0);
        await this.videoProcessingService.processVideo(video);
    }
}