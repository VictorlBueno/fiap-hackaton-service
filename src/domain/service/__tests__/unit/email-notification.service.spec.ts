import { Test, TestingModule } from '@nestjs/testing';
import { EmailNotificationService } from '../../email-notification.service';
import { EmailProviderPort } from '../../../ports/gateways/email-provider.port';
import { AuthServiceAdapter } from '../../../../infrastructure/adapters/gateways/auth-service.adapter';
import { ProcessingJob, JobStatus } from '../../../entities/processing-job.entity';

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockEmailProvider: jest.Mocked<EmailProviderPort>;
  let mockAuthService: jest.Mocked<AuthServiceAdapter>;

  const mockUserEmail = 'user@example.com';
  const mockUserSub = 'user-123';

  const mockCompletedJob = ProcessingJob.createCompleted(
    'job-123',
    'video.mp4',
    'user-456',
    150,
    'frames.zip',
  );

  const mockFailedJob = ProcessingJob.createFailed(
    'job-456',
    'video2.mp4',
    'user-789',
    'FFmpeg processing failed',
  );

  beforeEach(async () => {
    mockEmailProvider = {
      sendEmail: jest.fn(),
    };

    mockAuthService = {
      getUserEmail: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationService,
        {
          provide: 'EmailProviderPort',
          useValue: mockEmailProvider,
        },
        {
          provide: AuthServiceAdapter,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<EmailNotificationService>(EmailNotificationService);
  });

  describe('Given EmailNotificationService', () => {
    describe('When notifying video processing complete for completed job', () => {
      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Then should send success email with correct content', async () => {
        await service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub);

        expect(mockAuthService.getUserEmail).toHaveBeenCalledWith(mockUserSub);
        expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
          to: mockUserEmail,
          subject: `Processamento de vídeo concluído: ${mockCompletedJob.videoName}`,
          html: expect.stringContaining('Processamento Concluído com Sucesso'),
        });
      });

      it('Then should include job details in email content', async () => {
        await service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(mockCompletedJob.id);
        expect(emailCall.html).toContain(mockCompletedJob.videoName);
        expect(emailCall.html).toContain(mockCompletedJob.frameCount?.toString() || '0');
        expect(emailCall.html).toContain(mockCompletedJob.zipPath || 'N/A');
      });
    });

    describe('When notifying video processing complete for failed job', () => {
      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Then should send error email with correct content', async () => {
        await service.notifyVideoProcessingComplete(mockFailedJob, mockUserSub);

        expect(mockAuthService.getUserEmail).toHaveBeenCalledWith(mockUserSub);
        expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
          to: mockUserEmail,
          subject: `Erro no processamento de vídeo: ${mockFailedJob.videoName}`,
          html: expect.stringContaining('Erro no Processamento'),
        });
      });

      it('Then should include error details in email content', async () => {
        await service.notifyVideoProcessingComplete(mockFailedJob, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(mockFailedJob.id);
        expect(emailCall.html).toContain(mockFailedJob.videoName);
        expect(emailCall.html).toContain(mockFailedJob.message);
      });
    });

    describe('When user email retrieval fails', () => {
      describe('And auth service returns null', () => {
        beforeEach(() => {
          mockAuthService.getUserEmail.mockResolvedValue(null);
        });

        it('Then should return early without sending email', async () => {
          await service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub);

          expect(mockAuthService.getUserEmail).toHaveBeenCalledWith(mockUserSub);
          expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
        });
      });

      describe('And auth service throws error', () => {
        beforeEach(() => {
          mockAuthService.getUserEmail.mockRejectedValue(new Error('Auth service error'));
        });

        it('Then should propagate the error', async () => {
          await expect(
            service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub),
          ).rejects.toThrow('Auth service error');
        });
      });
    });

    describe('When email sending fails', () => {
      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockRejectedValue(new Error('Email service error'));
      });

      it('Then should propagate the error', async () => {
        await expect(
          service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub),
        ).rejects.toThrow('Email service error');
      });
    });

    describe('When job has no updatedAt date', () => {
      const jobWithoutUpdatedAt = new ProcessingJob(
        'job-789',
        'video3.mp4',
        JobStatus.COMPLETED,
        'Processamento concluído! 100 frames extraídos.',
        'user-123',
        100,
        'frames3.zip',
        new Date('2025-01-15T10:30:00Z'),
        undefined,
      );

      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Then should use createdAt date in email', async () => {
        await service.notifyVideoProcessingComplete(jobWithoutUpdatedAt, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(jobWithoutUpdatedAt.createdAt.toLocaleString('pt-BR'));
      });
    });

    describe('When job has updatedAt date', () => {
      const jobWithUpdatedAt = new ProcessingJob(
        'job-999',
        'video4.mp4',
        JobStatus.COMPLETED,
        'Processamento concluído! 200 frames extraídos.',
        'user-456',
        200,
        'frames4.zip',
        new Date('2025-01-15T10:30:00Z'),
        new Date('2025-01-15T11:30:00Z'),
      );

      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Then should use updatedAt date in email', async () => {
        await service.notifyVideoProcessingComplete(jobWithUpdatedAt, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(jobWithUpdatedAt.updatedAt?.toLocaleString('pt-BR'));
      });
    });

    describe('When handling different job statuses', () => {
      const pendingJob = ProcessingJob.createPending('job-pending', 'video-pending.mp4', 'user-123');
      const processingJob = ProcessingJob.createProcessing('job-processing', 'video-processing.mp4', 'user-456');

      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Then should not send email for pending job', async () => {
        await service.notifyVideoProcessingComplete(pendingJob, mockUserSub);

        expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
      });

      it('Then should not send email for processing job', async () => {
        await service.notifyVideoProcessingComplete(processingJob, mockUserSub);

        expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });
  });
}); 