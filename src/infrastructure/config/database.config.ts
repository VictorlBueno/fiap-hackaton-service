import { Pool } from 'pg';

export const createDatabasePool = (): Pool => {
    return new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT!) || 5432,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
        database: process.env.DB_NAME || 'video_processor',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
    });
};

