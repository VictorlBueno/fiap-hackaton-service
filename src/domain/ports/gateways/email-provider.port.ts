export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProviderPort {
  sendEmail(emailData: EmailData): Promise<boolean>;
} 