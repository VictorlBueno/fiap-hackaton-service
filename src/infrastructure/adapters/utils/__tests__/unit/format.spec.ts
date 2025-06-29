import Format from "../../format";

describe('Format - Unit Tests', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Given Format.formatDuration', () => {
        describe('When date is less than a minute ago', () => {
            it('Then should return "Agora mesmo"', () => {
                const date = new Date('2025-01-15T11:59:30Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('Agora mesmo');
            });

            it('Then should handle exact same time', () => {
                const date = new Date('2025-01-15T12:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('Agora mesmo');
            });
        });

        describe('When date is minutes ago', () => {
            it('Then should return singular minute format', () => {
                const date = new Date('2025-01-15T11:59:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('1 minuto atrás');
            });

            it('Then should return plural minutes format', () => {
                const date = new Date('2025-01-15T11:45:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('15 minutos atrás');
            });

            it('Then should handle 59 minutes', () => {
                const date = new Date('2025-01-15T11:01:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('59 minutos atrás');
            });
        });

        describe('When date is hours ago', () => {
            it('Then should return singular hour format', () => {
                const date = new Date('2025-01-15T11:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('1 hora atrás');
            });

            it('Then should return plural hours format', () => {
                const date = new Date('2025-01-15T09:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('3 horas atrás');
            });

            it('Then should handle 23 hours', () => {
                const date = new Date('2025-01-14T13:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('23 horas atrás');
            });
        });

        describe('When date is days ago', () => {
            it('Then should return singular day format', () => {
                const date = new Date('2025-01-14T12:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('1 dia atrás');
            });

            it('Then should return plural days format', () => {
                const date = new Date('2025-01-10T12:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('5 dias atrás');
            });

            it('Then should handle many days', () => {
                const date = new Date('2024-12-01T12:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('45 dias atrás');
            });
        });

        describe('When date is in future', () => {
            it('Then should handle future dates as negative', () => {
                const date = new Date('2025-01-15T13:00:00Z');
                const result = Format.formatDuration(date);

                expect(result).toBe('Agora mesmo');
            });
        });
    });

    describe('Given Format.formatJobs', () => {
        const mockCompletedJob = {
            id: 'job-123',
            videoName: 'video.mp4',
            status: 'completed',
            message: 'Processamento concluído',
            frameCount: 150,
            zipPath: 'frames.zip',
            createdAt: new Date('2025-01-15T10:00:00Z'),
        };

        const mockPendingJob = {
            id: 'job-456',
            videoName: 'video2.mp4',
            status: 'pending',
            message: 'Aguardando processamento',
            frameCount: null,
            zipPath: null,
            createdAt: new Date('2025-01-15T11:30:00Z'),
        };

        const mockFailedJob = {
            id: 'job-789',
            videoName: 'video3.mp4',
            status: 'failed',
            message: 'Erro no processamento',
            frameCount: null,
            zipPath: null,
            createdAt: new Date('2025-01-15T08:00:00Z'),
        };

        describe('When formatting completed job', () => {
            it('Then should include download URL and mark as downloadable', () => {
                const result = Format.formatJobs([mockCompletedJob]);

                expect(result).toHaveLength(1);
                expect(result[0]).toEqual({
                    id: 'job-123',
                    videoName: 'video.mp4',
                    status: 'completed',
                    message: 'Processamento concluído',
                    frameCount: 150,
                    zipFilename: 'frames.zip',
                    downloadUrl: '/download/frames.zip',
                    createdAt: '2025-01-15T10:00:00.000Z',
                    updatedAt: '2025-01-15T10:00:00.000Z',
                    duration: '2 horas atrás',
                    canDownload: true,
                });
            });
        });

        describe('When formatting pending job', () => {
            it('Then should have null download URL and not be downloadable', () => {
                const result = Format.formatJobs([mockPendingJob]);

                expect(result[0]).toEqual({
                    id: 'job-456',
                    videoName: 'video2.mp4',
                    status: 'pending',
                    message: 'Aguardando processamento',
                    frameCount: null,
                    zipFilename: null,
                    downloadUrl: null,
                    createdAt: '2025-01-15T11:30:00.000Z',
                    updatedAt: '2025-01-15T11:30:00.000Z',
                    duration: '30 minutos atrás',
                    canDownload: false,
                });
            });
        });

        describe('When formatting failed job', () => {
            it('Then should have null download URL and not be downloadable', () => {
                const result = Format.formatJobs([mockFailedJob]);

                expect(result[0]).toEqual({
                    id: 'job-789',
                    videoName: 'video3.mp4',
                    status: 'failed',
                    message: 'Erro no processamento',
                    frameCount: null,
                    zipFilename: null,
                    downloadUrl: null,
                    createdAt: '2025-01-15T08:00:00.000Z',
                    updatedAt: '2025-01-15T08:00:00.000Z',
                    duration: '4 horas atrás',
                    canDownload: false,
                });
            });
        });

        describe('When formatting multiple jobs', () => {
            it('Then should format all jobs correctly', () => {
                const jobs = [mockCompletedJob, mockPendingJob, mockFailedJob];
                const result = Format.formatJobs(jobs);

                expect(result).toHaveLength(3);
                expect(result[0].canDownload).toBe(true);
                expect(result[1].canDownload).toBe(false);
                expect(result[2].canDownload).toBe(false);
            });

            it('Then should preserve job order', () => {
                const jobs = [mockPendingJob, mockCompletedJob, mockFailedJob];
                const result = Format.formatJobs(jobs);

                expect(result[0].id).toBe('job-456');
                expect(result[1].id).toBe('job-123');
                expect(result[2].id).toBe('job-789');
            });
        });

        describe('When formatting empty job array', () => {
            it('Then should return empty array', () => {
                const result = Format.formatJobs([]);

                expect(result).toEqual([]);
                expect(result).toHaveLength(0);
            });
        });

        describe('When job has completed status but no zipPath', () => {
            const completedJobWithoutZip = {
                ...mockCompletedJob,
                zipPath: null,
            };

            it('Then should not be downloadable', () => {
                const result = Format.formatJobs([completedJobWithoutZip]);

                expect(result[0].downloadUrl).toBeNull();
                expect(result[0].canDownload).toBe(false);
            });
        });

        describe('When job has zipPath but not completed status', () => {
            const processingJobWithZip = {
                ...mockPendingJob,
                status: 'processing',
                zipPath: 'temp.zip',
            };

            it('Then should not be downloadable', () => {
                const result = Format.formatJobs([processingJobWithZip]);

                expect(result[0].downloadUrl).toBeNull();
                expect(result[0].canDownload).toBe(false);
            });
        });

        describe('When job has empty zipPath string', () => {
            const jobWithEmptyZip = {
                ...mockCompletedJob,
                zipPath: '',
            };

            it('Then should not be downloadable', () => {
                const result = Format.formatJobs([jobWithEmptyZip]);

                expect(result[0].downloadUrl).toBeNull();
                expect(result[0].canDownload).toBe(false);
            });
        });

        describe('When job has undefined frameCount', () => {
            const jobWithUndefinedFrameCount = {
                ...mockCompletedJob,
                frameCount: undefined,
            };

            it('Then should handle undefined frameCount', () => {
                const result = Format.formatJobs([jobWithUndefinedFrameCount]);

                expect(result[0].frameCount).toBeUndefined();
            });
        });

        describe('When job createdAt is very recent', () => {
            const recentJob = {
                ...mockCompletedJob,
                createdAt: new Date('2025-01-15T11:59:30Z'),
            };

            it('Then should show "Agora mesmo" duration', () => {
                const result = Format.formatJobs([recentJob]);

                expect(result[0].duration).toBe('Agora mesmo');
            });
        });
    });
});