import { Test, TestingModule } from '@nestjs/testing';
import { EmailNotificationService } from '../../email-notification.service';
import { EmailProviderPort } from '../../../ports/gateways/email-provider.port';
import { AuthServiceAdapter } from '../../../../infrastructure/adapters/gateways/auth-service.adapter';
import { ProcessingJob, JobStatus } from '../../../entities/processing-job.entity';

describe('Serviço de Notificação por Email', () => {
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

  describe('Dado o EmailNotificationService', () => {
    describe('Quando notificando processamento de vídeo concluído para job concluído', () => {
      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Então deve enviar email de sucesso com conteúdo correto', async () => {
        await service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub);

        expect(mockAuthService.getUserEmail).toHaveBeenCalledWith(mockUserSub);
        expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
          to: mockUserEmail,
          subject: `Processamento de vídeo concluído: ${mockCompletedJob.videoName}`,
          html: expect.stringContaining('Processamento Concluído com Sucesso'),
        });
      });

      it('Então deve incluir detalhes do job no conteúdo do email', async () => {
        await service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(mockCompletedJob.id);
        expect(emailCall.html).toContain(mockCompletedJob.videoName);
        expect(emailCall.html).toContain(mockCompletedJob.frameCount?.toString() || '0');
        expect(emailCall.html).toContain(mockCompletedJob.zipPath || 'N/A');
      });
    });

    describe('Quando notificando processamento de vídeo concluído para job falhado', () => {
      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Então deve enviar email de erro com conteúdo correto', async () => {
        await service.notifyVideoProcessingComplete(mockFailedJob, mockUserSub);

        expect(mockAuthService.getUserEmail).toHaveBeenCalledWith(mockUserSub);
        expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
          to: mockUserEmail,
          subject: `Erro no processamento de vídeo: ${mockFailedJob.videoName}`,
          html: expect.stringContaining('Erro no Processamento'),
        });
      });

      it('Então deve incluir detalhes do erro no conteúdo do email', async () => {
        await service.notifyVideoProcessingComplete(mockFailedJob, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(mockFailedJob.id);
        expect(emailCall.html).toContain(mockFailedJob.videoName);
        expect(emailCall.html).toContain(mockFailedJob.message);
      });
    });

    describe('Quando a recuperação do email do usuário falha', () => {
      describe('E o serviço de auth retorna null', () => {
        beforeEach(() => {
          mockAuthService.getUserEmail.mockResolvedValue(null);
        });

        it('Então deve retornar cedo sem enviar email', async () => {
          await service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub);

          expect(mockAuthService.getUserEmail).toHaveBeenCalledWith(mockUserSub);
          expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
        });
      });

      describe('E o serviço de auth lança erro', () => {
        beforeEach(() => {
          mockAuthService.getUserEmail.mockRejectedValue(new Error('Auth service error'));
        });

        it('Então deve propagar o erro', async () => {
          await expect(
            service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub),
          ).rejects.toThrow('Auth service error');
        });
      });
    });

    describe('Quando o envio de email falha', () => {
      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockRejectedValue(new Error('Email service error'));
      });

      it('Então deve propagar o erro', async () => {
        await expect(
          service.notifyVideoProcessingComplete(mockCompletedJob, mockUserSub),
        ).rejects.toThrow('Email service error');
      });
    });

    describe('Quando o job não tem data updatedAt', () => {
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

      it('Então deve usar a data createdAt no email', async () => {
        await service.notifyVideoProcessingComplete(jobWithoutUpdatedAt, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(jobWithoutUpdatedAt.createdAt.toLocaleString('pt-BR'));
      });
    });

    describe('Quando o job tem data updatedAt', () => {
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

      it('Então deve usar a data updatedAt no email', async () => {
        await service.notifyVideoProcessingComplete(jobWithUpdatedAt, mockUserSub);

        const emailCall = mockEmailProvider.sendEmail.mock.calls[0][0];
        expect(emailCall.html).toContain(jobWithUpdatedAt.updatedAt?.toLocaleString('pt-BR'));
      });
    });

    describe('Quando lidando com diferentes status de job', () => {
      const pendingJob = ProcessingJob.createPending('job-pending', 'video-pending.mp4', 'user-123');
      const processingJob = ProcessingJob.createProcessing('job-processing', 'video-processing.mp4', 'user-456');

      beforeEach(() => {
        mockAuthService.getUserEmail.mockResolvedValue(mockUserEmail);
        mockEmailProvider.sendEmail.mockResolvedValue(true);
      });

      it('Então não deve enviar email para job pendente', async () => {
        await service.notifyVideoProcessingComplete(pendingJob, mockUserSub);

        expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
      });

      it('Então não deve enviar email para job em processamento', async () => {
        await service.notifyVideoProcessingComplete(processingJob, mockUserSub);

        expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });
  });
}); 