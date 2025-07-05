import Format from '../../format';
import { ProcessingJob, JobStatus } from '../../../../../domain/entities/processing-job.entity';

describe('Format Utility', () => {
  describe('Given Format utility class', () => {
    describe('When formatting duration', () => {
      describe('And date is now', () => {
        it('Then should return "Agora mesmo"', () => {
          const now = new Date();
          const result = Format.formatDuration(now);
          expect(result).toBe('Agora mesmo');
        });
      });

      describe('And date is 30 minutes ago', () => {
        it('Then should return "30 minutos atrás"', () => {
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const result = Format.formatDuration(thirtyMinutesAgo);
          expect(result).toBe('30 minutos atrás');
        });
      });

      describe('And date is 1 minute ago', () => {
        it('Then should return "1 minuto atrás"', () => {
          const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
          const result = Format.formatDuration(oneMinuteAgo);
          expect(result).toBe('1 minuto atrás');
        });
      });

      describe('And date is 2 hours ago', () => {
        it('Then should return "2 horas atrás"', () => {
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          const result = Format.formatDuration(twoHoursAgo);
          expect(result).toBe('2 horas atrás');
        });
      });

      describe('And date is 1 hour ago', () => {
        it('Then should return "1 hora atrás"', () => {
          const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
          const result = Format.formatDuration(oneHourAgo);
          expect(result).toBe('1 hora atrás');
        });
      });

      describe('And date is 3 days ago', () => {
        it('Then should return "3 dias atrás"', () => {
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          const result = Format.formatDuration(threeDaysAgo);
          expect(result).toBe('3 dias atrás');
        });
      });

      describe('And date is 1 day ago', () => {
        it('Then should return "1 dia atrás"', () => {
          const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
          const result = Format.formatDuration(oneDayAgo);
          expect(result).toBe('1 dia atrás');
        });
      });

      describe('And date is in the future', () => {
        it('Then should return "Agora mesmo" for future dates', () => {
          const futureDate = new Date(Date.now() + 1000);
          const result = Format.formatDuration(futureDate);
          expect(result).toBe('Agora mesmo');
        });
      });

      describe('And date is exactly 59 minutes ago', () => {
        it('Then should return "59 minutos atrás"', () => {
          const fiftyNineMinutesAgo = new Date(Date.now() - 59 * 60 * 1000);
          const result = Format.formatDuration(fiftyNineMinutesAgo);
          expect(result).toBe('59 minutos atrás');
        });
      });

      describe('And date is exactly 23 hours ago', () => {
        it('Then should return "23 horas atrás"', () => {
          const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
          const result = Format.formatDuration(twentyThreeHoursAgo);
          expect(result).toBe('23 horas atrás');
        });
      });
    });

    describe('When formatting jobs', () => {
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

      describe('And job is completed with zip file', () => {
        it('Then should format completed job correctly', () => {
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

        it('Then should include correct download URL', () => {
          const result = Format.formatJobs([mockCompletedJob]);
          expect(result[0].downloadUrl).toBe(`/download/${mockCompletedJob.zipPath}`);
          expect(result[0].canDownload).toBe(true);
        });
      });

      describe('And job is pending', () => {
        it('Then should format pending job correctly', () => {
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

        it('Then should not allow download', () => {
          const result = Format.formatJobs([mockPendingJob]);
          expect(result[0].downloadUrl).toBeNull();
          expect(result[0].canDownload).toBe(false);
        });
      });

      describe('And job is failed', () => {
        it('Then should format failed job correctly', () => {
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

        it('Then should not allow download', () => {
          const result = Format.formatJobs([mockFailedJob]);
          expect(result[0].downloadUrl).toBeNull();
          expect(result[0].canDownload).toBe(false);
        });
      });

      describe('And job is completed without zip file', () => {
        it('Then should not allow download when zipPath is undefined', () => {
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

        it('Then should not allow download when zipPath is undefined', () => {
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

      describe('And multiple jobs are provided', () => {
        it('Then should format all jobs correctly', () => {
          const jobs = [mockCompletedJob, mockPendingJob, mockFailedJob];
          const result = Format.formatJobs(jobs);

          expect(result).toHaveLength(3);
          expect(result[0].id).toBe(mockCompletedJob.id);
          expect(result[1].id).toBe(mockPendingJob.id);
          expect(result[2].id).toBe(mockFailedJob.id);
        });

        it('Then should maintain job order', () => {
          const jobs = [mockPendingJob, mockCompletedJob, mockFailedJob];
          const result = Format.formatJobs(jobs);

          expect(result[0].id).toBe(mockPendingJob.id);
          expect(result[1].id).toBe(mockCompletedJob.id);
          expect(result[2].id).toBe(mockFailedJob.id);
        });
      });

      describe('And empty array is provided', () => {
        it('Then should return empty array', () => {
          const result = Format.formatJobs([]);
          expect(result).toEqual([]);
        });
      });

      describe('And job has special characters in name', () => {
        it('Then should handle special characters correctly', () => {
          const jobWithSpecialChars = new ProcessingJob(
            'job-special',
            'vídeo-teste_ção.mp4',
            JobStatus.COMPLETED,
            'Completed with special chars',
            'user-123',
            50,
            'vídeo-teste_ção.zip',
          );

          const result = Format.formatJobs([jobWithSpecialChars]);
          expect(result[0].videoName).toBe('vídeo-teste_ção.mp4');
          expect(result[0].zipFilename).toBe('vídeo-teste_ção.zip');
          expect(result[0].downloadUrl).toBe('/download/vídeo-teste_ção.zip');
        });
      });

      describe('And job has very long name', () => {
        it('Then should handle long names correctly', () => {
          const longName = 'a'.repeat(255) + '.mp4';
          const jobWithLongName = new ProcessingJob(
            'job-long',
            longName,
            JobStatus.COMPLETED,
            'Completed with long name',
            'user-123',
            75,
            'long-name.zip',
          );

          const result = Format.formatJobs([jobWithLongName]);
          expect(result[0].videoName).toBe(longName);
          expect(result[0].videoName.length).toBe(259); // 255 + '.mp4'
        });
      });

      describe('And job has undefined frameCount', () => {
        it('Then should handle undefined frameCount correctly', () => {
          const jobWithUndefinedFrames = new ProcessingJob(
            'job-undefined-frames',
            'video.mp4',
            JobStatus.COMPLETED,
            'Completed with undefined frames',
            'user-123',
            undefined,
            'frames.zip',
          );

          const result = Format.formatJobs([jobWithUndefinedFrames]);
          expect(result[0].frameCount).toBeUndefined();
        });
      });

      describe('And job has zero frameCount', () => {
        it('Then should handle zero frameCount correctly', () => {
          const jobWithZeroFrames = new ProcessingJob(
            'job-zero-frames',
            'video.mp4',
            JobStatus.COMPLETED,
            'Completed with zero frames',
            'user-123',
            0,
            'frames.zip',
          );

          const result = Format.formatJobs([jobWithZeroFrames]);
          expect(result[0].frameCount).toBe(0);
        });
      });
    });

    describe('When handling edge cases', () => {
      describe('And date is exactly at boundary values', () => {
        it('Then should handle exactly 60 minutes ago', () => {
          const exactlyOneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const result = Format.formatDuration(exactlyOneHourAgo);
          expect(result).toBe('1 hora atrás');
        });

        it('Then should handle exactly 24 hours ago', () => {
          const exactlyOneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const result = Format.formatDuration(exactlyOneDayAgo);
          expect(result).toBe('1 dia atrás');
        });
      });

      describe('And job has undefined properties', () => {
        it('Then should handle undefined frameCount', () => {
          const jobWithUndefinedFrames = new ProcessingJob(
            'job-undefined',
            'video.mp4',
            JobStatus.COMPLETED,
            'Completed with undefined frames',
            'user-123',
            undefined,
            'frames.zip',
          );

          const result = Format.formatJobs([jobWithUndefinedFrames]);
          expect(result[0].frameCount).toBeUndefined();
        });
      });
    });
  });
});