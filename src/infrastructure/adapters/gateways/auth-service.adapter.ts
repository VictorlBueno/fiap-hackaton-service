import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface AuthServiceResponse {
  success: boolean;
  email?: string;
  message?: string;
}

@Injectable()
export class AuthServiceAdapter {
  private readonly authServiceUrl: string;

  constructor() {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL!;
  }

  async getUserEmail(userSub: string): Promise<string | null> {
    try {
      const response = await axios.get<AuthServiceResponse>(
        `${this.authServiceUrl}/api/v1/users/${userSub}/email`,
        {
          timeout: 5000,
        }
      );

      if (response.data.success && response.data.email) {
        return response.data.email;
      }

      console.warn(`Falha ao buscar e-mail do usuário ${userSub}:`, response.data.message);
      return null;
    } catch (error) {
      console.error(`Erro ao chamar serviço de auth para usuário ${userSub}:`, error.message);
      return null;
    }
  }
} 