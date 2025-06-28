import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import {ChannelModel} from "amqplib";

export interface VideoProcessingMessage {
    id: string;
    videoPath: string;
    timestamp: string;
    originalName: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private connection: ChannelModel;
    private channel: amqp.Channel;
    private readonly queueName = 'video_processing';
    private isConnected = false;

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
            console.log('🐰 Conectando ao RabbitMQ...', rabbitmqUrl);

            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            await this.channel.assertQueue(this.queueName, {
                durable: true, // Fila persistente
            });

            this.isConnected = true;
            console.log('✅ RabbitMQ conectado e fila criada');

            // Handle connection errors
            this.connection.on('error', (error) => {
                console.error('❌ Erro de conexão RabbitMQ:', error.message);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.warn('⚠️ Conexão RabbitMQ fechada');
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ Erro ao conectar RabbitMQ:', error.message);
            this.isConnected = false;
            // Não interrompe a aplicação se RabbitMQ falhar
        }
    }

    private async disconnect(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            console.log('🐰 RabbitMQ desconectado');
        } catch (error) {
            console.error('❌ Erro ao desconectar RabbitMQ:', error.message);
        }
    }

    async sendToQueue(message: VideoProcessingMessage): Promise<boolean> {
        try {
            if (!this.isConnected || !this.channel) {
                console.error('❌ RabbitMQ não está conectado');
                return false;
            }

            const messageBuffer = Buffer.from(JSON.stringify(message));
            const result = this.channel.sendToQueue(this.queueName, messageBuffer, {
                persistent: true, // Mensagem persistente
            });

            console.log(`📤 Mensagem enviada para fila: ${message.id}`);
            return result;
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error.message);
            return false;
        }
    }

    async consumeQueue(callback: (message: VideoProcessingMessage) => Promise<void>): Promise<void> {
        try {
            if (!this.isConnected || !this.channel) {
                console.error('❌ RabbitMQ não está conectado para consumo');
                return;
            }

            await this.channel.prefetch(1); // Processa uma mensagem por vez

            await this.channel.consume(this.queueName, async (msg) => {
                if (msg !== null) {
                    try {
                        const message: VideoProcessingMessage = JSON.parse(msg.content.toString());
                        console.log(`📥 Processando mensagem da fila: ${message.id}`);

                        await callback(message);

                        this.channel.ack(msg); // Confirma processamento
                        console.log(`✅ Mensagem processada e confirmada: ${message.id}`);
                    } catch (error) {
                        console.error(`❌ Erro ao processar mensagem:`, error.message);
                        this.channel.nack(msg, false, false); // Rejeita mensagem sem requeue
                    }
                }
            });

            console.log('🎯 Consumidor de fila RabbitMQ ativo');
        } catch (error) {
            console.error('❌ Erro ao consumir fila:', error.message);
            throw error;
        }
    }

    isConnectionReady(): boolean {
        return this.isConnected;
    }
}