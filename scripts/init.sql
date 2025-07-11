-- Inicialização do banco de dados
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela principal para jobs de processamento
CREATE TABLE IF NOT EXISTS processing_jobs (
                                               id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    video_name VARCHAR(255) NOT NULL,
    video_path VARCHAR(500),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    message TEXT,
    frame_count INTEGER,
    zip_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_status ON processing_jobs(user_id, status);

-- Trigger para atualizar updated_at
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

-- Inserir dados de exemplo para diferentes usuários (opcional para desenvolvimento)
INSERT INTO processing_jobs (
    id,
    user_id,
    video_name,
    status,
    message,
    frame_count,
    zip_filename,
    created_at
) VALUES
      (
          uuid_generate_v4(),
          '54282418-a061-70d7-e35a-5d5603eaeb4c'::UUID,
          'video_exemplo.mp4',
          'completed',
          'Processamento de exemplo concluído! 120 frames extraídos.',
          120,
          concat(uuid_generate_v4()::text, '.zip'),
          NOW() - INTERVAL '1 hour'
      ),
      (
          uuid_generate_v4(),
          '12345678-1234-1234-1234-123456789012'::UUID,
          'outro_video.mp4',
          'completed',
          'Processamento concluído! 85 frames extraídos.',
          85,
          concat(uuid_generate_v4()::text, '.zip'),
          NOW() - INTERVAL '30 minutes'
      ),
      (
          uuid_generate_v4(),
          '54282418-a061-70d7-e35a-5d5603eaeb4c'::UUID,
          'video_falhado.mp4',
          'failed',
          'Erro no processamento: FFmpeg não encontrado',
          NULL,
          NULL,
          NOW() - INTERVAL '15 minutes'
      ) ON CONFLICT (id) DO NOTHING;

-- View para estatísticas (opcional)
CREATE OR REPLACE VIEW processing_stats AS
SELECT
    user_id,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
    AVG(CASE WHEN status = 'completed' THEN frame_count END) as avg_frames,
    MAX(created_at) as last_job_at
FROM processing_jobs
GROUP BY user_id;

-- Comentários para documentação
COMMENT ON TABLE processing_jobs IS 'Tabela principal para armazenar jobs de processamento de vídeo';
COMMENT ON COLUMN processing_jobs.id IS 'ID único do job (UUID)';
COMMENT ON COLUMN processing_jobs.user_id IS 'ID do usuário proprietário do job (do JWT)';
COMMENT ON COLUMN processing_jobs.video_name IS 'Nome original do arquivo de vídeo';
COMMENT ON COLUMN processing_jobs.video_path IS 'Caminho temporário do vídeo durante processamento';
COMMENT ON COLUMN processing_jobs.status IS 'Status atual: pending, processing, completed, failed';
COMMENT ON COLUMN processing_jobs.message IS 'Mensagem descritiva do status atual';
COMMENT ON COLUMN processing_jobs.frame_count IS 'Número de frames extraídos (quando completed)';
COMMENT ON COLUMN processing_jobs.zip_filename IS 'Nome do arquivo ZIP gerado (UUID.zip)';
COMMENT ON COLUMN processing_jobs.created_at IS 'Data/hora de criação do job';
COMMENT ON COLUMN processing_jobs.updated_at IS 'Data/hora da última atualização';

-- Função para cleanup de jobs antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_jobs(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
deleted_count INTEGER;
BEGIN
DELETE FROM processing_jobs
WHERE created_at < NOW() - INTERVAL '1 day' * days_old
  AND status IN ('completed', 'failed');

GET DIAGNOSTICS deleted_count = ROW_COUNT;

RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_jobs IS 'Remove jobs antigos (completed/failed) após X dias';

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
    RAISE NOTICE 'Tables created: processing_jobs';
    RAISE NOTICE 'Extensions: uuid-ossp';
    RAISE NOTICE 'Sample data: % rows inserted', (SELECT COUNT(*) FROM processing_jobs);
END $$;