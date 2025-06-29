import { Pool } from 'pg';

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

    const createJobsTable = `
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      video_name VARCHAR(255) NOT NULL,
      video_path VARCHAR(500),
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      message TEXT,
      frame_count INTEGER,
      zip_path VARCHAR(255),
      zip_filename VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

    const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
  `;

    const createUpdateTrigger = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_processing_jobs_updated_at ON processing_jobs;
    CREATE TRIGGER update_processing_jobs_updated_at 
        BEFORE UPDATE ON processing_jobs 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
  `;

    try {
        await pool.query(createJobsTable);
        await pool.query(createIndexes);
        await pool.query(createUpdateTrigger);
        console.log('✅ Database initialized with processing_jobs table');
    } catch (error) {
        console.log('⚠️ Database initialization failed:', error.message);
    } finally {
        await pool.end();
    }
};