-- Inicialização do banco de dados
CREATE
EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela para resultados de processamento
CREATE TABLE IF NOT EXISTS processing_results
(
    id
    SERIAL
    PRIMARY
    KEY,
    success
    BOOLEAN
    NOT
    NULL,
    message
    TEXT
    NOT
    NULL,
    zip_path
    VARCHAR
(
    255
),
    frame_count INTEGER,
    images JSONB,
    created_at TIMESTAMP DEFAULT NOW
(
),
    updated_at TIMESTAMP DEFAULT NOW
(
)
    );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processing_results_created_at ON processing_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_results_success ON processing_results(success);

-- Trigger para atualizar updated_at
CREATE
OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at
= NOW();
RETURN NEW;
END;
$$
language 'plpgsql';

CREATE TRIGGER update_processing_results_updated_at
    BEFORE UPDATE
    ON processing_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo (opcional)
INSERT INTO processing_results (success, message, zip_path, frame_count, images)
VALUES (true, 'Processamento de exemplo concluído', 'frames_example.zip', 120,
        '["frame_0001.png", "frame_0002.png"]') ON CONFLICT DO NOTHING;