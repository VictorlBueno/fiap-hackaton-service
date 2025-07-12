import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { AuthServiceAdapter } from '../../auth-service.adapter';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('Adaptador de Serviço de Autenticação', () => {
  let adapter: AuthServiceAdapter;

  beforeEach(async () => {
    process.env.AUTH_SERVICE_URL = 'http://localhost:3234';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthServiceAdapter],
    }).compile();

    adapter = module.get<AuthServiceAdapter>(AuthServiceAdapter);
    jest.clearAllMocks();
  });

  describe('Dado o AuthServiceAdapter', () => {
    describe('Quando obtendo email do usuário com sucesso', () => {
      const mockUserId = 'user-123';
      const mockUserEmail = 'test@example.com';

      beforeEach(() => {
        mockAxios.get.mockResolvedValue({
          data: {
            success: true,
            email: mockUserEmail,
          },
        });
      });

      it('Então deve retornar o email do usuário', async () => {
        const result = await adapter.getUserEmail(mockUserId);

        expect(result).toBe(mockUserEmail);
        expect(mockAxios.get).toHaveBeenCalledWith(
          `${process.env.AUTH_SERVICE_URL || 'http://localhost:3234'}/v1/users/${mockUserId}/email`,
          {
            timeout: 5000,
          }
        );
      });

      it('Então deve usar URL padrão do serviço de auth quando não configurado', async () => {
        delete process.env.AUTH_SERVICE_URL;

        await adapter.getUserEmail(mockUserId);

        expect(mockAxios.get).toHaveBeenCalledWith(
          'http://localhost:3234/v1/users/user-123/email',
          {
            timeout: 5000,
          }
        );
      });
    });

    describe('Quando o serviço de auth retorna success false', () => {
      const mockUserId = 'user-456';

      beforeEach(() => {
        mockAxios.get.mockResolvedValue({
          data: {
            success: false,
            message: 'User not found',
          },
        });
      });

      it('Então deve retornar null', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await adapter.getUserEmail(mockUserId);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          `Falha ao buscar e-mail do usuário ${mockUserId}:`,
          'User not found'
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Quando a requisição para o serviço de auth falha', () => {
      const mockUserId = 'user-999';
      const networkError = new Error('Network timeout');

      beforeEach(() => {
        mockAxios.get.mockRejectedValue(networkError);
      });

      it('Então deve retornar null e logar erro', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await adapter.getUserEmail(mockUserId);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          `Erro ao chamar serviço de auth para usuário ${mockUserId}:`,
          'Network timeout'
        );

        consoleSpy.mockRestore();
      });

      it('Então não deve lançar exceção', async () => {
        await expect(adapter.getUserEmail(mockUserId)).resolves.toBeNull();
      });
    });
  });
}); 