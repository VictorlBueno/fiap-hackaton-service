import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { GmailEmailProviderAdapter } from '../../gmail-email-provider.adapter';
import { EmailData } from '../../../../../domain/ports/gateways/email-provider.port';

jest.mock('nodemailer');

describe('GmailEmailProviderAdapter', () => {
  let adapter: GmailEmailProviderAdapter;
  let mockTransporter: any;
  let originalEnv: NodeJS.ProcessEnv;

  const mockEmailData: EmailData = {
    to: 'test@example.com',
    subject: 'Test Subject',
    html: '<p>Test email content</p>',
  };

  beforeEach(async () => {
    originalEnv = { ...process.env };
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [GmailEmailProviderAdapter],
    }).compile();

    adapter = module.get<GmailEmailProviderAdapter>(GmailEmailProviderAdapter);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Given GmailEmailProviderAdapter', () => {
    describe('When sending email successfully', () => {
      it('Then should create transporter with correct configuration', () => {
        expect(nodemailer.createTransport).toHaveBeenCalledWith({
          service: 'gmail',
          auth: {
            user: 'test@gmail.com',
            pass: 'test-password',
          },
        });
      });

      it('Then should send email with correct parameters', async () => {
        const result = await adapter.sendEmail(mockEmailData);

        expect(result).toBe(true);
        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
          from: 'test@gmail.com',
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test email content</p>',
        });
      });

      it('Then should log success message', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        await adapter.sendEmail(mockEmailData);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          'E-mail enviado com sucesso para: test@example.com'
        );

        consoleLogSpy.mockRestore();
      });
    });

    describe('When sending email fails', () => {
      const sendError = new Error('SMTP connection failed');

      beforeEach(() => {
        mockTransporter.sendMail.mockRejectedValue(sendError);
      });

      it('Then should return false and log error', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await adapter.sendEmail(mockEmailData);

        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Erro ao enviar e-mail para test@example.com:',
          'SMTP connection failed'
        );

        consoleErrorSpy.mockRestore();
      });

      it('Then should not throw exception', async () => {
        await expect(adapter.sendEmail(mockEmailData)).resolves.toBe(false);
      });
    });

    describe('When environment variables are missing', () => {
      it('Then should use undefined values gracefully', async () => {
        delete process.env.GMAIL_USER;
        delete process.env.GMAIL_APP_PASSWORD;

        const newAdapter = new GmailEmailProviderAdapter();

        expect(nodemailer.createTransport).toHaveBeenCalledWith({
          service: 'gmail',
          auth: {
            user: undefined,
            pass: undefined,
          },
        });
      });
    });

    describe('When sending different email formats', () => {
      it('Then should handle complex HTML content', async () => {
        const complexEmailData: EmailData = {
          to: 'user@example.com',
          subject: 'Complex Email',
          html: `
            <div style="color: red;">
              <h1>Title</h1>
              <p>Content with <strong>bold</strong> and <em>italic</em> text</p>
            </div>
          `,
        };

        await adapter.sendEmail(complexEmailData);

        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
          from: 'test@gmail.com',
          to: 'user@example.com',
          subject: 'Complex Email',
          html: expect.stringContaining('<h1>Title</h1>'),
        });
      });

      it('Then should handle special characters in subject', async () => {
        const specialEmailData: EmailData = {
          to: 'user@example.com',
          subject: 'Email com acentos: áéíóú çãõ',
          html: '<p>Test</p>',
        };

        await adapter.sendEmail(specialEmailData);

        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
          from: 'test@gmail.com',
          to: 'user@example.com',
          subject: 'Email com acentos: áéíóú çãõ',
          html: '<p>Test</p>',
        });
      });
    });
  });
}); 