import { Inject, Injectable } from '@nestjs/common';
import { EmailProviderPort } from '../ports/gateways/email-provider.port';
import { ProcessingJob } from '../entities/processing-job.entity';
import { JobStatus } from '../entities/processing-job.entity';
import { AuthServiceAdapter } from '../../infrastructure/adapters/gateways/auth-service.adapter';

@Injectable()
export class EmailNotificationService {
  constructor(
    @Inject('EmailProviderPort')
    private readonly emailProvider: EmailProviderPort,
    private readonly authService: AuthServiceAdapter,
  ) {}

  async notifyVideoProcessingComplete(job: ProcessingJob, userSub: string): Promise<void> {
    console.warn(`[DEBUG] Notificação: userSub recebido: ${userSub}`);
    const userEmail = await this.authService.getUserEmail(userSub);
    console.warn(`[DEBUG] Notificação: e-mail retornado: ${userEmail}`);
    
    if (!userEmail) {
      console.warn(`[DEBUG] Notificação: Nao foi possivel obter e-mail do usuario ${userSub} para envio de notificacao`);
      return;
    }

    if (job.isCompleted()) {
      const result = await this.sendSuccessEmail(job, userEmail);
      console.warn(`[DEBUG] Notificação: Resultado envio e-mail sucesso: ${result}`);
    } else if (job.isFailed()) {
      const result = await this.sendErrorEmail(job, userEmail);
      console.warn(`[DEBUG] Notificação: Resultado envio e-mail erro: ${result}`);
    }
  }

  private async sendSuccessEmail(job: ProcessingJob, userEmail: string): Promise<boolean> {
    const subject = `Processamento de vídeo concluído: ${job.videoName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #28a745;">Processamento Concluído com Sucesso!</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Detalhes do Processamento:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;"><strong>Vídeo:</strong> ${job.videoName}</li>
            <li style="margin: 10px 0;"><strong>ID do Job:</strong> ${job.id}</li>
            <li style="margin: 10px 0;"><strong>Frames Extraídos:</strong> ${job.frameCount || 0}</li>
            <li style="margin: 10px 0;"><strong>Arquivo ZIP:</strong> ${job.zipPath || 'N/A'}</li>
            <li style="margin: 10px 0;"><strong>Data de Conclusão:</strong> ${job.updatedAt?.toLocaleString('pt-BR') || job.createdAt.toLocaleString('pt-BR')}</li>
          </ul>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Seu vídeo foi processado com sucesso! Os frames extraídos estão disponíveis para download 
          no formato ZIP. Você pode acessar o arquivo através da interface do sistema.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #28a745; color: white; padding: 15px 30px; border-radius: 5px; display: inline-block;">
            Processamento Finalizado
          </div>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Este é um e-mail automático do sistema de processamento de vídeos.
        </p>
      </div>
    `;

    return await this.emailProvider.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  private async sendErrorEmail(job: ProcessingJob, userEmail: string): Promise<boolean> {
    const subject = `Erro no processamento de vídeo: ${job.videoName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545;">Erro no Processamento</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Detalhes do Erro:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;"><strong>Vídeo:</strong> ${job.videoName}</li>
            <li style="margin: 10px 0;"><strong>ID do Job:</strong> ${job.id}</li>
            <li style="margin: 10px 0;"><strong>Erro:</strong> ${job.message}</li>
            <li style="margin: 10px 0;"><strong>Data do Erro:</strong> ${job.updatedAt?.toLocaleString('pt-BR') || job.createdAt.toLocaleString('pt-BR')}</li>
          </ul>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Ocorreu um erro durante o processamento do seu vídeo. Por favor, verifique se o arquivo 
          está em um formato suportado e tente novamente. Se o problema persistir, entre em contato 
          com o suporte.
        </p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">Formatos Suportados:</h4>
          <p style="margin: 0; color: #856404;">mp4, avi, mov, mkv, wmv, flv, webm</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #dc3545; color: white; padding: 15px 30px; border-radius: 5px; display: inline-block;">
            Processamento Falhou
          </div>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Este é um e-mail automático do sistema de processamento de vídeos.
        </p>
      </div>
    `;

    return await this.emailProvider.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }
} 