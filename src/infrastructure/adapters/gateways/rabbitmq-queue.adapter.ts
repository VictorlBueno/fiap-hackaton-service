import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ChannelModel } from 'amqplib';
import {
  QueueMessage,
  QueuePort,
} from '../../../domain/ports/gateways/queue.port';

@Injectable()
export class RabbitMQQueueAdapter
  implements QueuePort, OnModuleInit, OnModuleDestroy
{
  private connection: ChannelModel | null;
  private channel: amqp.Channel;
  private readonly queueName = 'video_processing';
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async sendMessage(message: QueueMessage): Promise<boolean> {
    try {
      if (!this.isConnected) {
        console.log('Tentando reconectar antes de enviar...');
        await this.connect();

        if (!this.isConnected) {
          console.error('Falha na reconexão');
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!this.channel) {
        console.error('Canal não disponível');
        return false;
      }

      const buffer = Buffer.from(JSON.stringify(message));
      const result = this.channel.sendToQueue(this.queueName, buffer, {
        persistent: true,
        deliveryMode: 2,
      });

      console.log(
        `Mensagem enviada: ${message.id} (usuário: ${message.userId})`,
      );
      return result;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async consumeMessages(
    callback: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    try {
      if (!this.isConnected || !this.channel) {
        console.error('RabbitMQ não conectado para consumo');
        return;
      }

      await this.channel.prefetch(1);

      await this.channel.consume(this.queueName, async (msg) => {
        if (msg) {
          try {
            const message: QueueMessage = JSON.parse(msg.content.toString());
            console.log(
              `Processando: ${message.id} (usuário: ${message.userId})`,
            );

            await callback(message);

            this.channel.ack(msg);
            console.log(`Concluído: ${message.id}`);
          } catch (error) {
            console.error('Erro no processamento:', error.message);
            const shouldRequeue =
              !error.message.includes('FFmpeg') &&
              !error.message.includes('arquivo');
            this.channel.nack(msg, false, shouldRequeue);
          }
        }
      });

      console.log('Consumidor RabbitMQ ativo');
    } catch (error) {
      console.error('Erro ao configurar consumidor:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  private async connect(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL!;
      console.log('Conectando ao RabbitMQ...');

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue(this.queueName, { durable: true });
      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log('RabbitMQ conectado e fila criada');

      // Configurar handlers de erro
      this.connection.on('error', (error) => {
        console.error('Erro de conexão RabbitMQ:', error.message);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        console.warn('Conexão RabbitMQ fechada');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.channel.on('error', (error) => {
        console.error('Erro no canal RabbitMQ:', error.message);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.channel.on('close', () => {
        console.warn('Canal RabbitMQ fechado');
        this.isConnected = false;
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Erro ao conectar RabbitMQ:', error.message);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `Máximo de tentativas de reconexão atingido (${this.maxReconnectAttempts})`,
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      `Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms...`,
    );

    setTimeout(async () => {
      await this.connect();
    }, delay);
  }

  private async disconnect(): Promise<void> {
    try {
      this.isConnected = false;

      if (this.channel) {
        await this.channel.close();
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      console.log('RabbitMQ desconectado');
    } catch (error) {
      console.error('Erro ao desconectar:', error.message);
    }
  }
}
