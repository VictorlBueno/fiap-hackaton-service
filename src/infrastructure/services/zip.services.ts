import {Injectable} from '@nestjs/common';
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ZipService {
    async createZipFile(files: string[], zipPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', {zlib: {level: 9}});

            output.on('close', () => resolve());
            archive.on('error', (err) => reject(err));

            archive.pipe(output);

            files.forEach(file => {
                archive.file(file, {name: path.basename(file)});
            });

            archive.finalize();
        });
    }
}