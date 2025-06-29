import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  JobStatus,
  ProcessingJob,
} from '../../../domain/entities/processing-job.entity';
import { ProcessedFile } from '../../../domain/entities/processed-file.entity';
import { createDatabasePool } from '../../config/database.config';
import { JobRepositoryPort } from '../../../domain/ports/repositories/job-repository.port';

@Injectable()
export class PostgresJobRepositoryAdapter implements JobRepositoryPort {
  private pool: Pool;

  constructor() {
    this.pool = createDatabasePool();
  }

  async saveJob(job: ProcessingJob): Promise<void> {
    const query = `
      INSERT INTO processing_jobs (
        id, user_id, video_name, video_path, status, message, 
        frame_count, zip_path, zip_filename, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        message = EXCLUDED.message,
        frame_count = EXCLUDED.frame_count,
        zip_path = EXCLUDED.zip_path,
        zip_filename = EXCLUDED.zip_filename,
        updated_at = NOW()
    `;

    const values = [
      job.id,
      job.userId,
      job.videoName,
      null, // video_path será atualizado durante processamento
      job.status,
      job.message,
      job.frameCount || null,
      job.zipPath || null,
      job.zipPath || null, // zip_filename igual ao zipPath por enquanto
      job.createdAt,
    ];

    try {
      await this.pool.query(query, values);
      console.log(
        `💾 Job salvo no PostgreSQL: ${job.id} - ${job.status} (usuário: ${job.userId})`,
      );
    } catch (error) {
      console.error('❌ Erro ao salvar job no PostgreSQL:', error.message);
      throw error;
    }
  }

  async findJobById(id: string, userId: string): Promise<ProcessingJob | null> {
    const query = `
      SELECT id, user_id, video_name, status, message, frame_count, 
             zip_filename, created_at, updated_at
      FROM processing_jobs 
      WHERE id = $1 AND user_id = $2
    `;

    try {
      const result = await this.pool.query(query, [id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new ProcessingJob(
        row.id,
        row.video_name,
        row.status as JobStatus,
        row.message,
        row.user_id,
        row.frame_count,
        row.zip_filename,
        row.created_at,
      );
    } catch (error) {
      console.error('❌ Erro ao buscar job no PostgreSQL:', error.message);
      return null;
    }
  }

  async getProcessedFilesByUser(userId: string): Promise<ProcessedFile[]> {
    const query = `
      SELECT zip_filename, created_at
      FROM processing_jobs 
      WHERE user_id = $1 AND status = 'completed' AND zip_filename IS NOT NULL
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      const files: ProcessedFile[] = [];

      for (const row of result.rows) {
        if (row.zip_filename) {
          try {
            // Tentar obter stats do arquivo físico
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join('outputs', row.zip_filename);
            const stats = await fs.stat(filePath);

            files.push(
              new ProcessedFile(
                row.zip_filename,
                stats.size,
                stats.mtime,
                `/download/${row.zip_filename}`,
              ),
            );
          } catch (fsError) {
            // Se arquivo não existe fisicamente, incluir com tamanho 0
            files.push(
              new ProcessedFile(
                row.zip_filename,
                0,
                row.created_at,
                `/download/${row.zip_filename}`,
              ),
            );
          }
        }
      }

      console.log(
        `📋 Listados ${files.length} arquivos do PostgreSQL para usuário ${userId}`,
      );
      return files;
    } catch (error) {
      console.error('❌ Erro ao listar arquivos do PostgreSQL:', error.message);
      return [];
    }
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    message: string,
    additionalData?: Partial<ProcessingJob>,
  ): Promise<void> {
    const query = `
      UPDATE processing_jobs 
      SET status = $1, message = $2, frame_count = $3, zip_filename = $4, updated_at = NOW()
      WHERE id = $5
    `;

    const values = [
      status,
      message,
      additionalData?.frameCount || null,
      additionalData?.zipPath || null,
      id,
    ];

    try {
      await this.pool.query(query, values);
      console.log(`🔄 Status atualizado no PostgreSQL: ${id} -> ${status}`);
    } catch (error) {
      console.error(
        '❌ Erro ao atualizar status no PostgreSQL:',
        error.message,
      );
      throw error;
    }
  }

  async updateJobVideoPath(id: string, videoPath: string): Promise<void> {
    const query = `UPDATE processing_jobs SET video_path = $1 WHERE id = $2`;

    try {
      await this.pool.query(query, [videoPath, id]);
      console.log(`📁 Caminho do vídeo atualizado: ${id} -> ${videoPath}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar caminho do vídeo:', error.message);
    }
  }

  async getAllJobsByUser(userId: string): Promise<ProcessingJob[]> {
    const query = `
      SELECT id, user_id, video_name, status, message, frame_count, 
             zip_filename, created_at, updated_at
      FROM processing_jobs 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      const jobs = result.rows.map(
        (row) =>
          new ProcessingJob(
            row.id,
            row.video_name,
            row.status as JobStatus,
            row.message,
            row.user_id,
            row.frame_count,
            row.zip_filename,
            row.created_at,
          ),
      );

      console.log(
        `📋 Retornados ${jobs.length} jobs do PostgreSQL para usuário ${userId}`,
      );
      return jobs;
    } catch (error) {
      console.error(
        '❌ Erro ao buscar todos os jobs no PostgreSQL:',
        error.message,
      );
      return [];
    }
  }
}
