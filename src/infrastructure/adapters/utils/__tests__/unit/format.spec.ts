import Format from '../../format';
import { ProcessingJob, JobStatus } from '../../../../../domain/entities/processing-job.entity';

describe('Utilitário de Formatação', () => {
  describe('Dado o utilitário de Formatação', () => {
    describe('Quando formatando duração', () => {
      describe('E a data é agora', () => {
        it('Então deve retornar "Agora mesmo"', () => {
          const now = new Date();
          const result = Format.formatDuration(now);
          expect(result).toBe('Agora mesmo');
        });
      });

      describe('E a data é há 30 minutos', () => {
        it('Então deve retornar "30 minutos atrás"', () => {
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const result = Format.formatDuration(thirtyMinutesAgo);
          expect(result).toBe('30 minutos atrás');
        });
      });

      describe('E a data é há 1 minuto', () => {
        it('Então deve retornar "1 minuto atrás"', () => {
          const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
          const result = Format.formatDuration(oneMinuteAgo);
          expect(result).toBe('1 minuto atrás');
        });
      });

      describe('E a data é há 2 horas', () => {
        it('Então deve retornar "2 horas atrás"', () => {
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          const result = Format.formatDuration(twoHoursAgo);
          expect(result).toBe('2 horas atrás');
        });
      });

      describe('E a data é há 1 hora', () => {
        it('Então deve retornar "1 hora atrás"', () => {
          const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
          const result = Format.formatDuration(oneHourAgo);
          expect(result).toBe('1 hora atrás');
        });
      });

      describe('E a data é há 3 dias', () => {
        it('Então deve retornar "3 dias atrás"', () => {
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          const result = Format.formatDuration(threeDaysAgo);
          expect(result).toBe('3 dias atrás');
        });
      });

      describe('E a data é há 1 dia', () => {
        it('Então deve retornar "1 dia atrás"', () => {
          const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
          const result = Format.formatDuration(oneDayAgo);
          expect(result).toBe('1 dia atrás');
        });
      });

      describe('E a data é no futuro', () => {
        it('Então deve retornar "Agora mesmo" para datas futuras', () => {
          const futureDate = new Date(Date.now() + 1000);
          const result = Format.formatDuration(futureDate);
          expect(result).toBe('Agora mesmo');
        });
      });

      describe('E a data é exatamente há 59 minutos', () => {
        it('Então deve retornar "59 minutos atrás"', () => {
          const fiftyNineMinutesAgo = new Date(Date.now() - 59 * 60 * 1000);
          const result = Format.formatDuration(fiftyNineMinutesAgo);
          expect(result).toBe('59 minutos atrás');
        });
      });

      describe('E a data é exatamente há 23 horas', () => {
        it('Então deve retornar "23 horas atrás"', () => {
          const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
          const result = Format.formatDuration(twentyThreeHoursAgo);
          expect(result).toBe('23 horas atrás');
        });
      });
    });

    describe('Quando formatando jobs', () => {
      const mockCompletedJob = ProcessingJob.createCompleted(
        'job-123',
        'video.mp4',
        'user-456',
        150,
        'frames.zip',
      );

      const mockPendingJob = ProcessingJob.createPending(
        'job-456',
        'video2.mp4',
        'user-789',
      );

      const mockFailedJob = ProcessingJob.createFailed(
        'job-789',
        'video3.mp4',
        'user-123',
        'Processing failed',
      );

      describe('E o job está concluído com arquivo zip', () => {
        it('Então deve formatar job concluído corretamente', () => {
          const result = Format.formatJobs([mockCompletedJob]);

          expect(result).toHaveLength(1);
          expect(result[0]).toEqual({
            id: mockCompletedJob.id,
            videoName: mockCompletedJob.videoName,
            status: mockCompletedJob.status,
            message: mockCompletedJob.message,
            frameCount: mockCompletedJob.frameCount,
            zipFilename: mockCompletedJob.zipPath,
            downloadUrl: `/download/${mockCompletedJob.zipPath}`,
            createdAt: mockCompletedJob.createdAt.toISOString(),
            updatedAt: mockCompletedJob.createdAt.toISOString(),
            duration: expect.any(String),
            canDownload: true,
          });
        });

        it('Então deve incluir URL de download correta', () => {
          const result = Format.formatJobs([mockCompletedJob]);
          expect(result[0].downloadUrl).toBe(`/download/${mockCompletedJob.zipPath}`);
          expect(result[0].canDownload).toBe(true);
        });
      });

      describe('E o job está pendente', () => {
        it('Então deve formatar job pendente corretamente', () => {
          const result = Format.formatJobs([mockPendingJob]);

          expect(result).toHaveLength(1);
          expect(result[0]).toEqual({
            id: mockPendingJob.id,
            videoName: mockPendingJob.videoName,
            status: mockPendingJob.status,
            message: mockPendingJob.message,
            frameCount: mockPendingJob.frameCount,
            zipFilename: mockPendingJob.zipPath,
            downloadUrl: null,
            createdAt: mockPendingJob.createdAt.toISOString(),
            updatedAt: mockPendingJob.createdAt.toISOString(),
            duration: expect.any(String),
            canDownload: false,
          });
        });

        it('Então não deve permitir download', () => {
          const result = Format.formatJobs([mockPendingJob]);
          expect(result[0].downloadUrl).toBeNull();
          expect(result[0].canDownload).toBe(false);
        });
      });

      describe('E o job falhou', () => {
        it('Então deve formatar job falhado corretamente', () => {
          const result = Format.formatJobs([mockFailedJob]);

          expect(result).toHaveLength(1);
          expect(result[0]).toEqual({
            id: mockFailedJob.id,
            videoName: mockFailedJob.videoName,
            status: mockFailedJob.status,
            message: mockFailedJob.message,
            frameCount: mockFailedJob.frameCount,
            zipFilename: mockFailedJob.zipPath,
            downloadUrl: null,
            createdAt: mockFailedJob.createdAt.toISOString(),
            updatedAt: mockFailedJob.createdAt.toISOString(),
            duration: expect.any(String),
            canDownload: false,
          });
        });

        it('Então não deve permitir download', () => {
          const result = Format.formatJobs([mockFailedJob]);
          expect(result[0].downloadUrl).toBeNull();
          expect(result[0].canDownload).toBe(false);
        });
      });

      describe('E o job está concluído sem arquivo zip', () => {
        it('Então não deve permitir download quando zipPath é undefined', () => {
          const jobWithoutZip = new ProcessingJob(
            'job-no-zip',
            'video-no-zip.mp4',
            JobStatus.COMPLETED,
            'Completed without zip',
            'user-123',
            100,
            undefined,
          );

          const result = Format.formatJobs([jobWithoutZip]);
          expect(result[0].downloadUrl).toBeNull();
          expect(result[0].canDownload).toBe(false);
        });

        it('Então não deve permitir download quando zipPath é undefined', () => {
          const jobWithoutZip = new ProcessingJob(
            'job-no-zip',
            'video-no-zip.mp4',
            JobStatus.COMPLETED,
            'Completed without zip',
            'user-123',
            100,
            undefined,
          );

          const result = Format.formatJobs([jobWithoutZip]);
          expect(result[0].downloadUrl).toBeNull();
          expect(result[0].canDownload).toBe(false);
        });
      });

      describe('E múltiplos jobs são fornecidos', () => {
        it('Então deve formatar todos os jobs corretamente', () => {
          const jobs = [mockCompletedJob, mockPendingJob, mockFailedJob];
          const result = Format.formatJobs(jobs);

          expect(result).toHaveLength(3);
          expect(result[0].id).toBe(mockCompletedJob.id);
          expect(result[1].id).toBe(mockPendingJob.id);
          expect(result[2].id).toBe(mockFailedJob.id);
        });

        it('Então deve manter a ordem dos jobs', () => {
          const jobs = [mockPendingJob, mockCompletedJob, mockFailedJob];
          const result = Format.formatJobs(jobs);

          expect(result[0].id).toBe(mockPendingJob.id);
          expect(result[1].id).toBe(mockCompletedJob.id);
          expect(result[2].id).toBe(mockFailedJob.id);
        });
      });

      describe('E array vazio é fornecido', () => {
        it('Então deve retornar array vazio', () => {
          const result = Format.formatJobs([]);
          expect(result).toEqual([]);
        });
      });
    });
  });
});