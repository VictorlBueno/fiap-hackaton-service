import { Pool } from 'pg';
import { createDatabasePool } from '../../database.config';

jest.mock('pg');

const mockPool = Pool as jest.MockedClass<typeof Pool>;

describe('Configuração do Banco de Dados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'postgres123';
    process.env.DB_NAME = 'video_processor';
  });

  describe('Dada a configuração do banco de dados', () => {
    describe('Quando criando pool do banco com valores padrão', () => {
      it('Então deve criar pool com configuração padrão', () => {
        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith({
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'postgres123',
          database: 'video_processor',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
        });
      });
    });

    describe('Quando criando pool do banco com variáveis de ambiente customizadas', () => {
      it('Então deve criar pool com configuração customizada', () => {
        process.env.DB_HOST = 'custom-host';
        process.env.DB_PORT = '5432';
        process.env.DB_USERNAME = 'custom-user';
        process.env.DB_PASSWORD = 'custom-password';
        process.env.DB_NAME = 'custom-database';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith({
          host: 'custom-host',
          port: 5432,
          user: 'custom-user',
          password: 'custom-password',
          database: 'custom-database',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
        });
      });
    });

    describe('Quando criando pool do banco com variáveis de ambiente parciais', () => {
      it('Então deve usar valores customizados onde fornecidos e padrões para outros', () => {
        process.env.DB_HOST = 'partial-host';
        process.env.DB_USERNAME = 'partial-user';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith({
          host: 'partial-host',
          port: 5432,
          user: 'partial-user',
          password: 'postgres123',
          database: 'video_processor',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
        });
      });
    });

    describe('Quando criando pool do banco com porta inválida', () => {
      it('Então deve usar porta padrão quando a porta for inválida', () => {
        process.env.DB_PORT = 'invalid-port';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 5432,
          })
        );
      });

      it('Então deve lidar com string de porta vazia', () => {
        process.env.DB_PORT = '';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 5432,
          })
        );
      });
    });

    describe('Quando criando pool do banco com variáveis de ambiente vazias', () => {
      it('Então deve usar valores padrão para variáveis de ambiente vazias', () => {
        process.env.DB_HOST = '';
        process.env.DB_PORT = '';
        process.env.DB_USERNAME = '';
        process.env.DB_PASSWORD = '';
        process.env.DB_NAME = '';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith({
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'postgres123',
          database: 'video_processor',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
        });
      });
    });

    describe('Quando criando pool do banco com configurações de pool de conexão', () => {
      it('Então deve ter configuração correta do pool de conexão', () => {
        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 30000,
          })
        );
      });
    });

    describe('Quando criando pool do banco com diferentes valores de porta', () => {
      it('Então deve lidar com números de porta válidos', () => {
        process.env.DB_PORT = '5432';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 5432,
          })
        );
      });

      it('Então deve lidar com porta como string', () => {
        process.env.DB_PORT = '5434';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 5434,
          })
        );
      });

      it('Então deve lidar com números de porta grandes', () => {
        process.env.DB_PORT = '65535';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 65535,
          })
        );
      });
    });

    describe('Quando criando pool do banco com caracteres especiais nas credenciais', () => {
      it('Então deve lidar com caracteres especiais no nome de usuário', () => {
        process.env.DB_USERNAME = 'user@domain.com';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            user: 'user@domain.com',
          })
        );
      });

      it('Então deve lidar com caracteres especiais na senha', () => {
        process.env.DB_PASSWORD = 'pass@word#123!';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            password: 'pass@word#123!',
          })
        );
      });
    });
  });
}); 