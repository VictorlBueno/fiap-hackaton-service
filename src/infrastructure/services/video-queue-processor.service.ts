import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, VideoProcessingMessage } from './rabbitmq.service';
import * as fs from 'fs/promises';
import {ProcessVideoUseCase} from "../../application/usecases/process-video.usecase";

@Injectable()
export class VideoQueueProcessorService implements OnModuleInit {
    constructor(
        private readonly rabbitMQService: RabbitMQService,
        private readonly processVideoUseCase: ProcessVideoUseCase,
    ) {}

    async onModuleInit() {
        console.log('🎯 Iniciando VideoQueueProcessorService...');

        // Aguarda um pouco para garantir que RabbitMQ está conectado
        setTimeout(async () => {
            await this.startConsumer();
        }, 2000);
    }

    private async startConsumer() {
        try {
            console.log('🎯 Iniciando consumidor da fila...');
            await this.rabbitMQService.consumeQueue(this.processVideoMessage.bind(this));
            console.log('✅ Consumidor da fila iniciado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao iniciar consumidor:', error.message);

            // Tenta reconectar após 5 segundos
            setTimeout(() => {
                console.log('🔄 Tentando reconectar consumidor...');
                this.startConsumer();
            }, 5000);
        }
    }

    private async processVideoMessage(message: VideoProcessingMessage): Promise<void> {
        console.log(`🎬 Iniciando processamento em background: ${message.originalName} (ID: ${message.id})`);

        try {
            const result = await this.processVideoUseCase.execute(message.videoPath, message.timestamp);

            if (result.success) {
                console.log(`✅ Processamento concluído: ${message.id} - ${result.frameCount} frames`);

                // Remove arquivo original após processamento bem-sucedido
                try {
                    await fs.unlink(message.videoPath);
                    console.log(`🗑️ Arquivo original removido: ${message.videoPath}`);
                } catch (error) {
                    console.warn(`⚠️ Erro ao remover arquivo: ${error.message}`);
                }
            } else {
                console.error(`❌ Falha no processamento: ${message.id} - ${result.message}`);
            }

            console.log(`✅ Processamento background concluído: ${message.id}`);
        } catch (error) {
            console.error(`❌ Erro no processamento background: ${message.id}`, error.message);
            throw error; // Re-throw para que o RabbitMQ saiba que falhou
        }
    }
}