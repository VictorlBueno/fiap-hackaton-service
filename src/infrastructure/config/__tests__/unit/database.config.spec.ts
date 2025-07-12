import { Pool } from 'pg';
import { createDatabasePool } from '../../database.config';

jest.mock('pg');

const mockPool = Pool as jest.MockedClass<typeof Pool>;

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
  });

  describe('Given database configuration', () => {
    describe('When creating database pool with default values', () => {
      it('Then should create pool with default configuration', () => {
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

    describe('When creating database pool with custom environment variables', () => {
      it('Then should create pool with custom configuration', () => {
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

    describe('When creating database pool with partial environment variables', () => {
      it('Then should use custom values where provided and defaults for others', () => {
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

    describe('When creating database pool with invalid port', () => {
      it('Then should use default port when port is invalid', () => {
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

      it('Then should handle empty port string', () => {
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

    describe('When creating database pool with empty environment variables', () => {
      it('Then should use default values for empty environment variables', () => {
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

    describe('When creating database pool with connection pool settings', () => {
      it('Then should have correct connection pool configuration', () => {
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

    describe('When creating database pool with different port values', () => {
      it('Then should handle valid port numbers', () => {
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

      it('Then should handle port as string', () => {
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

      it('Then should handle large port numbers', () => {
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

    describe('When creating database pool with special characters in credentials', () => {
      it('Then should handle special characters in username', () => {
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

      it('Then should handle special characters in password', () => {
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

      it('Then should handle special characters in database name', () => {
        process.env.DB_NAME = 'test-db_123';

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            database: 'test-db_123',
          })
        );
      });
    });

    describe('When creating database pool with very long values', () => {
      it('Then should handle very long host names', () => {
        const longHost = 'a'.repeat(1000);
        process.env.DB_HOST = longHost;

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            host: longHost,
          })
        );
      });

      it('Then should handle very long usernames', () => {
        const longUser = 'b'.repeat(500);
        process.env.DB_USERNAME = longUser;

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            user: longUser,
          })
        );
      });

      it('Then should handle very long passwords', () => {
        const longPassword = 'c'.repeat(1000);
        process.env.DB_PASSWORD = longPassword;

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            password: longPassword,
          })
        );
      });

      it('Then should handle very long database names', () => {
        const longDatabase = 'd'.repeat(500);
        process.env.DB_NAME = longDatabase;

        const mockPoolInstance = {} as Pool;
        mockPool.mockImplementation(() => mockPoolInstance);

        const result = createDatabasePool();

        expect(result).toBe(mockPoolInstance);
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            database: longDatabase,
          })
        );
      });
    });

    describe('When creating multiple database pools', () => {
      it('Then should create independent pool instances', () => {
        const mockPoolInstance1 = {} as Pool;
        const mockPoolInstance2 = {} as Pool;
        mockPool
          .mockImplementationOnce(() => mockPoolInstance1)
          .mockImplementationOnce(() => mockPoolInstance2);

        const result1 = createDatabasePool();
        const result2 = createDatabasePool();

        expect(result1).toBe(mockPoolInstance1);
        expect(result2).toBe(mockPoolInstance2);
        expect(result1).not.toBe(result2);
        expect(mockPool).toHaveBeenCalledTimes(2);
      });
    });
  });
}); 