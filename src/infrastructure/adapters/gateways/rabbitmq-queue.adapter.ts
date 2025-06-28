import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { QueuePort, QueueMessage } from '../../../domain/ports/gateways/queue.port';
import * as amqp from 'amqplib';
import {ChannelModel} from "amqplib";

@Injectable()
export class RabbitMQQueueAdapter implements QueuePort, OnModuleInit, OnModuleDestroy {
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
            const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
            console.log('🐰 Conectando ao RabbitMQ...');

            this.connection = await amqp.connect(url);
            this.channel = await this.connection.createChannel();

            await this.channel.assertQueue(this.queueName, { durable: true });
            this.isConnected = true;

            console.log('✅ RabbitMQ conectado');
        } catch (error) {
            console.error('❌ Erro RabbitMQ:', error.message);
            this.isConnected = false;
        }
    }

    private async disconnect(): Promise<void> {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            this.isConnected = false;
            console.log('🐰 RabbitMQ desconectado');
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error.message);
        }
    }

    async sendMessage(message: QueueMessage): Promise<boolean> {
        try {
            if (!this.isConnected || !this.channel) return false;

            const buffer = Buffer.from(JSON.stringify(message));
            const result = this.channel.sendToQueue(this.queueName, buffer, { persistent: true });

            console.log(`📤 Mensagem enviada: ${message.id}`);
            return result;
        } catch (error) {
            console.error('❌ Erro ao enviar:', error.message);
            return false;
        }
    }

    async consumeMessages(callback: (message: QueueMessage) => Promise<void>): Promise<void> {
        try {
            if (!this.isConnected || !this.channel) return;

            await this.channel.prefetch(1);

            await this.channel.consume(this.queueName, async (msg) => {
                if (msg) {
                    try {
                        const message: QueueMessage = JSON.parse(msg.content.toString());
                        console.log(`📥 Processando: ${message.id}`);

                        await callback(message);
                        this.channel.ack(msg);

                        console.log(`✅ Concluído: ${message.id}`);
                    } catch (error) {
                        console.error('❌ Erro no callback:', error.message);
                        this.channel.nack(msg, false, false);
                    }
                }
            });

            console.log('🎯 Consumidor ativo');
        } catch (error) {
            console.error('❌ Erro no consumidor:', error.message);
        }
    }
}