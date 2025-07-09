import { Test, TestingModule } from '@nestjs/testing';
import * as amqp from 'amqplib';
import { EventEmitter } from 'events';
import { RabbitMQQueueAdapter } from "../../rabbitmq-queue.adapter";
import { QueueMessage } from "../../../../../domain/ports/gateways/queue.port";

jest.mock('amqplib');

const mockAmqp = amqp as jest.Mocked<typeof amqp>;

class MockConnection extends EventEmitter {
    createChannel = jest.fn();
    close = jest.fn();
}

class MockChannel extends EventEmitter {
    assertQueue = jest.fn();
    sendToQueue = jest.fn();
    prefetch = jest.fn();
    consume = jest.fn();
    ack = jest.fn();
    nack = jest.fn();
    close = jest.fn();
}

describe('RabbitMQQueueAdapter', () => {
    let adapter: RabbitMQQueueAdapter;
    let mockConnection: MockConnection;
    let mockChannel: MockChannel;

    const mockMessage: QueueMessage = {
        id: 'test-job-123',
        videoPath: '/uploads/video.mp4',
        videoName: 'video.mp4',
        userId: 'user-456',
    };

    beforeEach(async () => {
        mockConnection = new MockConnection();
        mockChannel = new MockChannel();

        mockConnection.createChannel.mockResolvedValue(mockChannel as any);
        mockChannel.assertQueue.mockResolvedValue({} as any);
        mockChannel.sendToQueue.mockReturnValue(true);
        mockChannel.prefetch.mockResolvedValue(undefined);
        mockChannel.consume.mockResolvedValue({} as any);
        mockChannel.ack.mockReturnValue(undefined);
        mockChannel.nack.mockReturnValue(undefined);

        mockAmqp.connect.mockResolvedValue(mockConnection as any);

        process.env.RABBITMQ_URL = 'amqp://localhost:5672';
        process.env.NODE_ENV = 'test';

        const module: TestingModule = await Test.createTestingModule({
            providers: [RabbitMQQueueAdapter],
        }).compile();

        adapter = module.get<RabbitMQQueueAdapter>(RabbitMQQueueAdapter);

        jest.clearAllMocks();
    });

    afterEach(async () => {
        delete process.env.RABBITMQ_URL;
        delete process.env.NODE_ENV;
    });

    describe('Given RabbitMQQueueAdapter initialization', () => {
        describe('When connection fails during initialization', () => {
            const connectionError = new Error('Connection refused');

            beforeEach(() => {
                mockAmqp.connect.mockRejectedValue(connectionError);
            });

            it('Then should handle connection error gracefully', async () => {
                await adapter.onModuleInit();

                expect(mockAmqp.connect).toHaveBeenCalled();
                expect(mockConnection.createChannel).not.toHaveBeenCalled();
            });
        });

        describe('When module destroys', () => {
            beforeEach(async () => {
                await adapter.onModuleInit();
            });

            it('Then should disconnect from RabbitMQ', async () => {
                await adapter.onModuleDestroy();

                expect(mockChannel.close).toHaveBeenCalledTimes(1);
                expect(mockConnection.close).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Given RabbitMQQueueAdapter message sending', () => {
        beforeEach(async () => {
            await adapter.onModuleInit();
        });

        describe('When sending message successfully', () => {
            it('Then should serialize and send message to queue', async () => {
                const result = await adapter.sendMessage(mockMessage);

                expect(result).toBe(true);
                expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
                    'video_processing',
                    Buffer.from(JSON.stringify(mockMessage)),
                    { persistent: true, deliveryMode: 2 }
                );
            });

            it('Then should return true for successful send', async () => {
                mockChannel.sendToQueue.mockReturnValue(true);

                const result = await adapter.sendMessage(mockMessage);

                expect(result).toBe(true);
            });
        });

        describe('When sending message fails', () => {
            const sendError = new Error('Channel closed');

            beforeEach(() => {
                mockChannel.sendToQueue.mockImplementation(() => {
                    throw sendError;
                });
            });

            it('Then should return false and mark as disconnected', async () => {
                const result = await adapter.sendMessage(mockMessage);

                expect(result).toBe(false);
                expect(mockChannel.sendToQueue).toHaveBeenCalled();
            });
        });

        describe('When channel is not available', () => {
            beforeEach(() => {
                (adapter as any).channel = null;
            });

            it('Then should return false', async () => {
                const result = await adapter.sendMessage(mockMessage);

                expect(result).toBe(false);
            });
        });
    });

    describe('Given RabbitMQQueueAdapter message consumption', () => {
        let mockCallback: jest.MockedFunction<(message: QueueMessage) => Promise<void>>;
        let consumeHandler: (msg: any) => Promise<void>;

        beforeEach(async () => {
            await adapter.onModuleInit();
            mockCallback = jest.fn().mockResolvedValue(undefined);

            mockChannel.consume.mockImplementation(async (queue, handler) => {
                consumeHandler = handler as any;
                return {} as any;
            });
        });

        describe('When consuming messages successfully', () => {
            const mockRabbitMessage = {
                content: Buffer.from(JSON.stringify(mockMessage)),
            };

            it('Then should setup consumer with prefetch and process messages', async () => {
                await adapter.consumeMessages(mockCallback);

                expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
                expect(mockChannel.consume).toHaveBeenCalledWith('video_processing', expect.any(Function));
            });

            it('Then should process message and acknowledge', async () => {
                await adapter.consumeMessages(mockCallback);
                await consumeHandler(mockRabbitMessage);

                expect(mockCallback).toHaveBeenCalledWith(mockMessage);
                expect(mockChannel.ack).toHaveBeenCalledWith(mockRabbitMessage);
            });
        });

        describe('When message processing fails', () => {
            const mockRabbitMessage = {
                content: Buffer.from(JSON.stringify(mockMessage)),
            };
            const processingError = new Error('Processing failed');

            beforeEach(() => {
                mockCallback.mockRejectedValue(processingError);
            });

            it('Then should nack message with requeue', async () => {
                await adapter.consumeMessages(mockCallback);
                await consumeHandler(mockRabbitMessage);

                expect(mockCallback).toHaveBeenCalledWith(mockMessage);
                expect(mockChannel.nack).toHaveBeenCalledWith(mockRabbitMessage, false, true);
            });
        });

        describe('When FFmpeg error occurs', () => {
            const mockRabbitMessage = {
                content: Buffer.from(JSON.stringify(mockMessage)),
            };
            const ffmpegError = new Error('FFmpeg not found');

            beforeEach(() => {
                mockCallback.mockRejectedValue(ffmpegError);
            });

            it('Then should nack message without requeue', async () => {
                await adapter.consumeMessages(mockCallback);
                await consumeHandler(mockRabbitMessage);

                expect(mockChannel.nack).toHaveBeenCalledWith(mockRabbitMessage, false, false);
            });
        });

        describe('When file error occurs', () => {
            const mockRabbitMessage = {
                content: Buffer.from(JSON.stringify(mockMessage)),
            };
            const fileError = new Error('file not found');

            beforeEach(() => {
                mockCallback.mockRejectedValue(fileError);
            });

            it('Then should nack message without requeue', async () => {
                await adapter.consumeMessages(mockCallback);
                await consumeHandler(mockRabbitMessage);

                expect(mockChannel.nack).toHaveBeenCalledWith(mockRabbitMessage, false, false);
            });
        });

        describe('When not connected for consumption', () => {
            beforeEach(() => {
                (adapter as any).isConnected = false;
            });

            it('Then should return early without setting up consumer', async () => {
                await adapter.consumeMessages(mockCallback);

                expect(mockChannel.prefetch).not.toHaveBeenCalled();
                expect(mockChannel.consume).not.toHaveBeenCalled();
            });
        });

        describe('When channel is not available for consumption', () => {
            beforeEach(() => {
                (adapter as any).channel = null;
            });

            it('Then should return early without setting up consumer', async () => {
                await adapter.consumeMessages(mockCallback);

                expect(mockChannel.prefetch).not.toHaveBeenCalled();
                expect(mockChannel.consume).not.toHaveBeenCalled();
            });
        });

        describe('When consumer setup fails', () => {
            const setupError = new Error('Consumer setup failed');

            beforeEach(() => {
                mockChannel.consume.mockRejectedValue(setupError);
            });

            it('Then should throw error and mark as disconnected', async () => {
                await expect(adapter.consumeMessages(mockCallback)).rejects.toThrow('Consumer setup failed');

                expect(mockChannel.consume).toHaveBeenCalled();
            });
        });

        describe('When receiving null message', () => {
            it('Then should handle null message gracefully', async () => {
                await adapter.consumeMessages(mockCallback);
                await consumeHandler(null);

                expect(mockCallback).not.toHaveBeenCalled();
                expect(mockChannel.ack).not.toHaveBeenCalled();
                expect(mockChannel.nack).not.toHaveBeenCalled();
            });
        });
    });

    describe('Given RabbitMQQueueAdapter disconnection', () => {
        beforeEach(async () => {
            await adapter.onModuleInit();
        });

        describe('When disconnecting gracefully', () => {
            it('Then should close channel and connection', async () => {
                await (adapter as any).disconnect();

                expect(mockChannel.close).toHaveBeenCalledTimes(1);
                expect(mockConnection.close).toHaveBeenCalledTimes(1);
            });
        });

        describe('When disconnection fails', () => {
            const disconnectError = new Error('Disconnect failed');

            beforeEach(() => {
                mockChannel.close.mockRejectedValue(disconnectError);
            });

            it('Then should handle disconnection errors gracefully', async () => {
                await expect((adapter as any).disconnect()).resolves.toBeUndefined();

                expect(mockChannel.close).toHaveBeenCalled();
            });
        });
    });

    describe('Given RabbitMQQueueAdapter reconnect logic', () => {
        let adapter: any;
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [RabbitMQQueueAdapter],
            }).compile();
            adapter = module.get<RabbitMQQueueAdapter>(RabbitMQQueueAdapter);
            adapter.reconnectAttempts = 0;
            adapter.maxReconnectAttempts = 2;
            jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });
        });
        it('Then should not schedule reconnect in test environment', () => {
            process.env.NODE_ENV = 'test';
            const connectSpy = jest.spyOn(adapter, 'connect').mockResolvedValue(undefined);
            adapter.scheduleReconnect();
            expect(connectSpy).not.toHaveBeenCalled();
        });
        it('Then should stop after max reconnect attempts', () => {
            adapter.reconnectAttempts = 2;
            const connectSpy = jest.spyOn(adapter, 'connect').mockResolvedValue(undefined);
            adapter.scheduleReconnect();
            expect(connectSpy).not.toHaveBeenCalled();
        });
        it('Then should schedule reconnect and call connect', async () => {
            process.env.NODE_ENV = 'development';
            const connectSpy = jest.spyOn(adapter, 'connect').mockResolvedValue(undefined);
            adapter.scheduleReconnect();
            expect(connectSpy).toHaveBeenCalled();
        });
    });
});