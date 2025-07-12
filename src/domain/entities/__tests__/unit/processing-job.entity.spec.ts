import {JobStatus, ProcessingJob} from "../../processing-job.entity";

describe('Job de Processamento', () => {
    const baseJobData = {
        id: '2025-06-28T16-43-36-099Z',
        videoName: 'video.mp4',
        userId: 'user-123',
    };

    describe('Dado um construtor de ProcessingJob', () => {
        describe('Quando criado com todos os parâmetros', () => {
            const createdAt = new Date('2025-01-15T10:30:00Z');
            const updatedAt = new Date('2025-01-15T11:30:00Z');

            const job = new ProcessingJob(
                baseJobData.id,
                baseJobData.videoName,
                JobStatus.COMPLETED,
                'Processamento concluído',
                baseJobData.userId,
                150,
                'frames.zip',
                createdAt,
                updatedAt,
            );

            it('Então deve definir todas as propriedades corretamente', () => {
                expect(job.id).toBe(baseJobData.id);
                expect(job.videoName).toBe(baseJobData.videoName);
                expect(job.status).toBe(JobStatus.COMPLETED);
                expect(job.message).toBe('Processamento concluído');
                expect(job.userId).toBe(baseJobData.userId);
                expect(job.frameCount).toBe(150);
                expect(job.zipPath).toBe('frames.zip');
                expect(job.createdAt).toBe(createdAt);
                expect(job.updatedAt).toBe(updatedAt);
            });
        });

        describe('Quando criado sem parâmetros opcionais', () => {
            const job = new ProcessingJob(
                baseJobData.id,
                baseJobData.videoName,
                JobStatus.PENDING,
                'Aguardando processamento',
                baseJobData.userId,
            );

            it('Então deve definir propriedades obrigatórias e valores padrão', () => {
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
                expect(job.updatedAt).toBeUndefined();
                expect(job.createdAt).toBeInstanceOf(Date);
            });
        });

        describe('Quando criado sem createdAt', () => {
            it('Então deve usar a data atual como padrão', () => {
                const beforeCreation = new Date();
                const job = new ProcessingJob(
                    baseJobData.id,
                    baseJobData.videoName,
                    JobStatus.PENDING,
                    'Test',
                    baseJobData.userId,
                );
                const afterCreation = new Date();

                expect(job.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
                expect(job.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
            });
        });
    });

    describe('Dados os métodos factory de ProcessingJob', () => {
        describe('Quando criando um job pendente', () => {
            const job = ProcessingJob.createPending(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Então deve ter status pendente e mensagem correta', () => {
                expect(job.status).toBe(JobStatus.PENDING);
                expect(job.message).toBe('Vídeo adicionado à fila de processamento');
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
            });
        });

        describe('Quando criando um job em processamento', () => {
            const job = ProcessingJob.createProcessing(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Então deve ter status de processamento e mensagem correta', () => {
                expect(job.status).toBe(JobStatus.PROCESSING);
                expect(job.message).toBe('Processando vídeo e extraindo frames...');
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
            });
        });

        describe('Quando criando um job concluído', () => {
            const frameCount = 150;
            const zipPath = 'frames.zip';

            const job = ProcessingJob.createCompleted(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                frameCount,
                zipPath,
            );

            it('Então deve ter status concluído com dados dos frames', () => {
                expect(job.status).toBe(JobStatus.COMPLETED);
                expect(job.message).toBe(`Processamento concluído! ${frameCount} frames extraídos.`);
                expect(job.frameCount).toBe(frameCount);
                expect(job.zipPath).toBe(zipPath);
            });
        });

        describe('Quando criando um job falhado', () => {
            const errorMessage = 'Arquivo corrompido';

            const job = ProcessingJob.createFailed(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                errorMessage,
            );

            it('Então deve ter status falhado com mensagem de erro', () => {
                expect(job.status).toBe(JobStatus.FAILED);
                expect(job.message).toBe(`Falha no processamento: ${errorMessage}`);
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
            });
        });
    });

    describe('Dados os métodos de status de ProcessingJob', () => {
        describe('Quando o job está concluído', () => {
            const job = ProcessingJob.createCompleted(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                100,
                'test.zip',
            );

            it('Então isCompleted deve retornar true', () => {
                expect(job.isCompleted()).toBe(true);
            });

            it('Então isFailed deve retornar false', () => {
                expect(job.isFailed()).toBe(false);
            });
        });

        describe('Quando o job falhou', () => {
            const job = ProcessingJob.createFailed(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                'Error',
            );

            it('Então isFailed deve retornar true', () => {
                expect(job.isFailed()).toBe(true);
            });

            it('Então isCompleted deve retornar false', () => {
                expect(job.isCompleted()).toBe(false);
            });
        });

        describe('Quando o job está pendente', () => {
            const job = ProcessingJob.createPending(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Então ambos os métodos de status devem retornar false', () => {
                expect(job.isCompleted()).toBe(false);
                expect(job.isFailed()).toBe(false);
            });
        });

        describe('Quando o job está em processamento', () => {
            const job = ProcessingJob.createProcessing(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Então ambos os métodos de status devem retornar false', () => {
                expect(job.isCompleted()).toBe(false);
                expect(job.isFailed()).toBe(false);
            });
        });
    });

    describe('Dado o enum JobStatus', () => {
        it('Então deve ter todos os valores esperados', () => {
            expect(JobStatus.PENDING).toBe('pending');
            expect(JobStatus.PROCESSING).toBe('processing');
            expect(JobStatus.COMPLETED).toBe('completed');
            expect(JobStatus.FAILED).toBe('failed');
        });
    });
});