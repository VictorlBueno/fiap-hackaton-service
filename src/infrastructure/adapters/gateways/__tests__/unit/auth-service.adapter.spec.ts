import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { AuthServiceAdapter } from '../../auth-service.adapter';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('AuthServiceAdapter', () => {
  let adapter: AuthServiceAdapter;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthServiceAdapter],
    }).compile();

    adapter = module.get<AuthServiceAdapter>(AuthServiceAdapter);
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Given AuthServiceAdapter', () => {
    describe('When getting user email successfully', () => {
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

      it('Then should return user email', async () => {
        const result = await adapter.getUserEmail(mockUserId);

        expect(result).toBe(mockUserEmail);
        expect(mockAxios.get).toHaveBeenCalledWith(
          `${process.env.AUTH_SERVICE_URL || 'http://localhost:3234'}/v1/users/${mockUserId}/email`,
          {
            timeout: 5000,
          }
        );
      });

      it('Then should use default auth service URL when not configured', async () => {
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

    describe('When auth service returns success false', () => {
      const mockUserId = 'user-456';

      beforeEach(() => {
        mockAxios.get.mockResolvedValue({
          data: {
            success: false,
            message: 'User not found',
          },
        });
      });

      it('Then should return null', async () => {
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

    describe('When auth service request fails', () => {
      const mockUserId = 'user-999';
      const networkError = new Error('Network timeout');

      beforeEach(() => {
        mockAxios.get.mockRejectedValue(networkError);
      });

      it('Then should return null and log error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await adapter.getUserEmail(mockUserId);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          `Erro ao chamar serviço de auth para usuário ${mockUserId}:`,
          'Network timeout'
        );

        consoleSpy.mockRestore();
      });

      it('Then should not throw exception', async () => {
        await expect(adapter.getUserEmail(mockUserId)).resolves.toBeNull();
      });
    });
  });
}); 