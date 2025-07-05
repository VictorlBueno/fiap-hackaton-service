import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailProviderPort, EmailData } from '../../../domain/ports/gateways/email-provider.port';

@Injectable()
export class GmailEmailProviderAdapter implements EmailProviderPort {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`E-mail enviado com sucesso para: ${emailData.to}`);
      return true;
    } catch (error) {
      console.error(`Erro ao enviar e-mail para ${emailData.to}:`, error.message);
      return false;
    }
  }
} 