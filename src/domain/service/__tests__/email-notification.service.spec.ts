import { Test, TestingModule } from '@nestjs/testing';
import { EmailNotificationService } from '../email-notification.service';
import { EmailProviderPort } from '../../ports/gateways/email-provider.port';
import { ProcessingJob, JobStatus } from '../../entities/processing-job.entity';

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockEmailProvider: jest.Mocked<EmailProviderPort>;

  const createMockJob = (status: JobStatus, frameCount?: number, zipPath?: string): ProcessingJob => {
    return {
      id: 'job-123',
      videoName: 'test-video.mp4',
      status,
      message: status === JobStatus.COMPLETED ? 'Processamento concluído!' : 'Erro no processamento',
      userId: 'user-456',
      frameCount,
      zipPath,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:05:00Z'),
      isCompleted: () => status === JobStatus.COMPLETED,
      isFailed: () => status === JobStatus.FAILED,
    } as ProcessingJob;
  };

  beforeEach(async () => {
    mockEmailProvider = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationService,
        {
          provide: 'EmailProviderPort',
          useValue: mockEmailProvider,
        },
      ],
    }).compile();

    service = module.get<EmailNotificationService>(EmailNotificationService);
  });

  describe('Given EmailNotificationService', () => {
    describe('When notifying completed job', () => {
      it('Then should send success email', async () => {
        const job = createMockJob(JobStatus.COMPLETED, 150, 'job-123.zip');
        const userEmail = 'test@example.com';

        await service.notifyVideoProcessingComplete(job, userEmail);

        expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
          to: userEmail,
          subject: expect.stringContaining('✅ Processamento de vídeo concluído'),
          html: expect.stringContaining('🎉 Processamento Concluído com Sucesso!'),
        });
      });

      it('Then should include job details in email', async () => {
        const job = createMockJob(JobStatus.COMPLETED, 200, 'job-123.zip');
        const userEmail = 'test@example.com';

        await service.notifyVideoProcessingComplete(job, userEmail);

        const call = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(call.html).toContain('test-video.mp4');
        expect(call.html).toContain('job-123');
        expect(call.html).toContain('200');
        expect(call.html).toContain('job-123.zip');
      });
    });

    describe('When notifying failed job', () => {
      it('Then should send error email', async () => {
        const job = createMockJob(JobStatus.FAILED);
        const userEmail = 'test@example.com';

        await service.notifyVideoProcessingComplete(job, userEmail);

        expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
          to: userEmail,
          subject: expect.stringContaining('❌ Erro no processamento de vídeo'),
          html: expect.stringContaining('⚠️ Erro no Processamento'),
        });
      });

      it('Then should include error details in email', async () => {
        const job = {
          ...createMockJob(JobStatus.FAILED),
          message: 'Arquivo corrompido',
        } as ProcessingJob;
        const userEmail = 'test@example.com';

        await service.notifyVideoProcessingComplete(job, userEmail);

        const call = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(call.html).toContain('Arquivo corrompido');
        expect(call.html).toContain('Formatos Suportados');
      });
    });

    describe('When email provider fails', () => {
      it('Then should handle email error gracefully', async () => {
        mockEmailProvider.sendEmail.mockRejectedValue(new Error('SMTP error'));
        const job = createMockJob(JobStatus.COMPLETED);
        const userEmail = 'test@example.com';

        await expect(service.notifyVideoProcessingComplete(job, userEmail)).rejects.toThrow('SMTP error');
      });
    });

    describe('When job status is pending or processing', () => {
      it('Then should not send any email', async () => {
        const pendingJob = createMockJob(JobStatus.PENDING);
        const processingJob = createMockJob(JobStatus.PROCESSING);
        const userEmail = 'test@example.com';

        await service.notifyVideoProcessingComplete(pendingJob, userEmail);
        await service.notifyVideoProcessingComplete(processingJob, userEmail);

        expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });

    describe('When job has no updatedAt date', () => {
      it('Then should use createdAt date in email', async () => {
        const job = {
          ...createMockJob(JobStatus.COMPLETED),
          updatedAt: undefined,
        } as ProcessingJob;
        const userEmail = 'test@example.com';

        await service.notifyVideoProcessingComplete(job, userEmail);

        const call = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(call.html).toContain('01/01/2024');
      });
    });
  });
}); 