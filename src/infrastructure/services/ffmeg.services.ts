import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

@Injectable()
export class FfmpegService {
    async extractFrames(videoPath: string, tempDir: string): Promise<string[]> {
        const framePattern = path.join(tempDir, 'frame_%04d.png');

        const command = `ffmpeg -i "${videoPath}" -vf fps=1 -y "${framePattern}"`;

        try {
            await execAsync(command);

            const files = await fs.readdir(tempDir);
            return files
                .filter(file => file.endsWith('.png'))
                .map(file => path.join(tempDir, file));

        } catch (error) {
            throw new Error(`Erro no ffmpeg: ${error.message}`);
        }
    }
}