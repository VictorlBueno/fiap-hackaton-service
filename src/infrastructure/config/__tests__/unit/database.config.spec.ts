import { Pool } from 'pg';
import { createDatabasePool, initDatabase } from '../../database.config';

jest.mock('pg');

describe('Database Pool Factory', () => {
  const MockedPool = Pool as jest.MockedClass<typeof Pool>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Given database configuration requirements', () => {
    describe('When creating a database pool with default configuration', () => {
      it('Should instantiate Pool with correct default parameters', () => {
        delete process.env.DB_HOST;
        delete process.env.DB_PORT;
        delete process.env.DB_USERNAME;
        delete process.env.DB_PASSWORD;
        delete process.env.DB_NAME;

        createDatabasePool();

        expect(MockedPool).toHaveBeenCalledWith({
          host: 'localhost',
          port: 5433,
          user: 'postgres',
          password: 'postgres123',
          database: 'video_processor',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
      });
    });

    describe('When creating a database pool with environment variables', () => {
      it('Should use environment configuration over defaults', () => {
        process.env.DB_HOST = 'custom-host';
        process.env.DB_PORT = '5432';
        process.env.DB_USERNAME = 'custom-user';
        process.env.DB_PASSWORD = 'custom-pass';
        process.env.DB_NAME = 'custom-db';

        createDatabasePool();

        expect(MockedPool).toHaveBeenCalledWith({
          host: 'custom-host',
          port: 5432,
          user: 'custom-user',
          password: 'custom-pass',
          database: 'custom-db',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
      });
    });

    describe('When DB_PORT is not a valid number', () => {
      it('Should fallback to default port', () => {
        process.env.DB_PORT = 'invalid';

        createDatabasePool();

        expect(MockedPool).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 5433,
          }),
        );
      });
    });
  });

  describe('Given database initialization requirements', () => {
    let mockPool: jest.Mocked<Pool>;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
        end: jest.fn(),
      } as any;
      MockedPool.mockImplementation(() => mockPool);
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    describe('When database initialization succeeds', () => {
      it('Should execute all required database operations and log success', async () => {
        // @ts-ignore
        mockPool.query.mockResolvedValue({} as any);

        await initDatabase();

        expect(mockPool.query).toHaveBeenCalledTimes(3);
        expect(mockPool.query).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('CREATE TABLE IF NOT EXISTS processing_jobs'),
        );
        expect(mockPool.query).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('CREATE INDEX IF NOT EXISTS'),
        );
        expect(mockPool.query).toHaveBeenNthCalledWith(
          3,
          expect.stringContaining('CREATE OR REPLACE FUNCTION'),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '✅ Database initialized with processing_jobs table',
        );
        expect(mockPool.end).toHaveBeenCalled();
      });
    });

    describe('When database initialization fails', () => {
      it('Should log error message and close connection', async () => {
        const errorMessage = 'Connection failed';
        // @ts-ignore
        mockPool.query.mockRejectedValue(new Error(errorMessage));

        await initDatabase();

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '⚠️ Database initialization failed:',
          errorMessage,
        );
        expect(mockPool.end).toHaveBeenCalled();
      });
    });

    describe('When table creation succeeds but index creation fails', () => {
      it('Should handle partial failure and close connection properly', async () => {
        mockPool.query
          // @ts-ignore
          .mockResolvedValueOnce({} as any)
          // @ts-ignore
          .mockRejectedValueOnce(new Error('Index creation failed'));

        await initDatabase();

        expect(mockPool.query).toHaveBeenCalledTimes(2);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '⚠️ Database initialization failed:',
          'Index creation failed',
        );
        expect(mockPool.end).toHaveBeenCalled();
      });
    });
  });

  describe('Given proper resource management requirements', () => {
    let mockPool: jest.Mocked<Pool>;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
        end: jest.fn(),
      } as any;
      MockedPool.mockImplementation(() => mockPool);
      jest.spyOn(console, 'log').mockImplementation();
    });

    describe('When database operations complete successfully', () => {
      it('Should always close the connection pool', async () => {
        // @ts-ignore
        mockPool.query.mockResolvedValue({} as any);

        await initDatabase();

        expect(mockPool.end).toHaveBeenCalledTimes(1);
      });
    });

    describe('When database operations throw an exception', () => {
      it('Should ensure connection pool is closed in finally block', async () => {
        // @ts-ignore
        mockPool.query.mockRejectedValue(new Error('Database error'));

        await initDatabase();

        expect(mockPool.end).toHaveBeenCalledTimes(1);
      });
    });
  });
});
