import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import {VideoProcessorPort} from "../../../domain/ports/gateways/video-processor.port";

const execAsync = promisify(exec);

@Injectable()
export class FfmpegVideoProcessorAdapter implements VideoProcessorPort {
    async extractFrames(videoPath: string, outputDir: string): Promise<string[]> {
        await this.checkFfmpegAvailable();
        await fs.mkdir(outputDir, { recursive: true });

        const framePattern = path.join(outputDir, 'frame_%04d.png');
        const command = `ffmpeg -i "${videoPath}" -vf fps=1 -y "${framePattern}"`;

        try {
            console.log(`🎬 Executando: ${command}`);
            await execAsync(command);

            const files = await fs.readdir(outputDir);
            const frameFiles = files
                .filter(file => file.endsWith('.png'))
                .map(file => path.join(outputDir, file));

            console.log(`✅ ${frameFiles.length} frames extraídos em: ${outputDir}`);

            // Verificar se os arquivos realmente existem
            for (const frame of frameFiles) {
                try {
                    await fs.access(frame);
                    const stats = await fs.stat(frame);
                    console.log(`📸 Frame: ${path.basename(frame)} - ${stats.size} bytes`);
                } catch (error) {
                    console.error(`❌ Frame não encontrado: ${frame}`);
                }
            }

            // NÃO REMOVER o diretório temporário aqui!
            // O ZIP service vai precisar dos arquivos
            return frameFiles;

        } catch (error) {
            // Em caso de erro, limpar diretório temporário
            await fs.rm(outputDir, { recursive: true, force: true });

            if (error.message.includes('not found')) {
                throw new Error('FFmpeg não está instalado');
            }
            throw new Error(`Erro no processamento: ${error.message}`);
        }
    }

    private async checkFfmpegAvailable(): Promise<void> {
        try {
            await execAsync('ffmpeg -version');
        } catch (error) {
            throw new Error('FFmpeg não encontrado. Instale: sudo apt install ffmpeg');
        }
    }
}