import {Pool} from 'pg';

export const createDatabasePool = (): Pool => {
    return new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT!) || 5433,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
        database: process.env.DB_NAME || 'video_processor',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
};

export const initDatabase = async (): Promise<void> => {
    const pool = createDatabasePool();

    const createTable = `
        CREATE TABLE IF NOT EXISTS processing_results (
                                                          id SERIAL PRIMARY KEY,
                                                          success BOOLEAN NOT NULL,
                                                          message TEXT NOT NULL,
                                                          zip_path VARCHAR(255),
            frame_count INTEGER,
            images JSONB,
            created_at TIMESTAMP DEFAULT NOW()
            );
    `;

    try {
        await pool.query(createTable);
        console.log('✅ Database initialized');
    } catch (error) {
        console.log('⚠️ Database initialization failed:', error.message);
        // Não interrompe a aplicação se o banco falhar
    } finally {
        await pool.end();
    }
};