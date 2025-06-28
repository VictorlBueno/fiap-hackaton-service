import {Injectable} from '@nestjs/common';
import {Pool} from 'pg';
import {ProcessingResult} from '../../domain/entities/processing-result.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import {IVideoProcessingRepository} from "../../domain/repositories/video-processing.repository";

@Injectable()
export class VideoProcessingRepository implements IVideoProcessingRepository {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT!) || 5433,
            user: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres123',
            database: process.env.DB_NAME || 'video_processor',
        });
    }

    async saveProcessingResult(result: ProcessingResult): Promise<void> {
        const query = `
      INSERT INTO processing_results (success, message, zip_path, frame_count, images, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

        try {
            await this.pool.query(query, [
                result.success,
                result.message,
                result.zipPath,
                result.frameCount,
                JSON.stringify(result.images),
            ]);
        } catch (error) {
            console.log('Error saving to database:', error.message);
        }
    }

    async getProcessedFiles(): Promise<any[]> {
        try {
            const files = await fs.readdir('outputs');
            const zipFiles = files.filter(file => file.endsWith('.zip'));

            const results: any = [];

            for (const file of zipFiles) {
                const filePath = path.join('outputs', file);
                const stats = await fs.stat(filePath);

                results.push({
                    filename: file,
                    size: stats.size,
                    created_at: stats.mtime.toISOString().replace('T', ' ').substring(0, 19),
                    download_url: `/download/${file}`,
                });
            }

            return results;
        } catch (error) {
            throw new Error('Erro ao listar arquivos');
        }
    }
}