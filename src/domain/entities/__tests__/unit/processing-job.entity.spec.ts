import {JobStatus, ProcessingJob} from "../../processing-job.entity";

describe('ProcessingJob', () => {
    const baseJobData = {
        id: '2025-06-28T16-43-36-099Z',
        videoName: 'video.mp4',
        userId: 'user-123',
    };

    describe('Given a ProcessingJob constructor', () => {
        describe('When creating with all parameters', () => {
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

            it('Then should set all properties correctly', () => {
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

        describe('When creating without optional parameters', () => {
            const job = new ProcessingJob(
                baseJobData.id,
                baseJobData.videoName,
                JobStatus.PENDING,
                'Aguardando processamento',
                baseJobData.userId,
            );

            it('Then should set required properties and defaults', () => {
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
                expect(job.updatedAt).toBeUndefined();
                expect(job.createdAt).toBeInstanceOf(Date);
            });
        });

        describe('When creating without createdAt', () => {
            it('Then should use current date as default', () => {
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

    describe('Given ProcessingJob factory methods', () => {
        describe('When creating a pending job', () => {
            const job = ProcessingJob.createPending(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Then should have pending status and correct message', () => {
                expect(job.status).toBe(JobStatus.PENDING);
                expect(job.message).toBe('Vídeo adicionado à fila de processamento');
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
            });
        });

        describe('When creating a processing job', () => {
            const job = ProcessingJob.createProcessing(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Then should have processing status and correct message', () => {
                expect(job.status).toBe(JobStatus.PROCESSING);
                expect(job.message).toBe('Processando vídeo e extraindo frames...');
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
            });
        });

        describe('When creating a completed job', () => {
            const frameCount = 150;
            const zipPath = 'frames.zip';

            const job = ProcessingJob.createCompleted(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                frameCount,
                zipPath,
            );

            it('Then should have completed status with frame data', () => {
                expect(job.status).toBe(JobStatus.COMPLETED);
                expect(job.message).toBe(`Processamento concluído! ${frameCount} frames extraídos.`);
                expect(job.frameCount).toBe(frameCount);
                expect(job.zipPath).toBe(zipPath);
            });
        });

        describe('When creating a failed job', () => {
            const errorMessage = 'Arquivo corrompido';

            const job = ProcessingJob.createFailed(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                errorMessage,
            );

            it('Then should have failed status with error message', () => {
                expect(job.status).toBe(JobStatus.FAILED);
                expect(job.message).toBe(`Falha no processamento: ${errorMessage}`);
                expect(job.frameCount).toBeUndefined();
                expect(job.zipPath).toBeUndefined();
            });
        });
    });

    describe('Given ProcessingJob status methods', () => {
        describe('When job is completed', () => {
            const job = ProcessingJob.createCompleted(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                100,
                'test.zip',
            );

            it('Then isCompleted should return true', () => {
                expect(job.isCompleted()).toBe(true);
            });

            it('Then isFailed should return false', () => {
                expect(job.isFailed()).toBe(false);
            });
        });

        describe('When job is failed', () => {
            const job = ProcessingJob.createFailed(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
                'Error',
            );

            it('Then isFailed should return true', () => {
                expect(job.isFailed()).toBe(true);
            });

            it('Then isCompleted should return false', () => {
                expect(job.isCompleted()).toBe(false);
            });
        });

        describe('When job is pending', () => {
            const job = ProcessingJob.createPending(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Then both status methods should return false', () => {
                expect(job.isCompleted()).toBe(false);
                expect(job.isFailed()).toBe(false);
            });
        });

        describe('When job is processing', () => {
            const job = ProcessingJob.createProcessing(
                baseJobData.id,
                baseJobData.videoName,
                baseJobData.userId,
            );

            it('Then both status methods should return false', () => {
                expect(job.isCompleted()).toBe(false);
                expect(job.isFailed()).toBe(false);
            });
        });
    });

    describe('Given JobStatus enum', () => {
        it('Then should have all expected values', () => {
            expect(JobStatus.PENDING).toBe('pending');
            expect(JobStatus.PROCESSING).toBe('processing');
            expect(JobStatus.COMPLETED).toBe('completed');
            expect(JobStatus.FAILED).toBe('failed');
        });
    });
});