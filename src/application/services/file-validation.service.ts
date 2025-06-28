import {Injectable} from '@nestjs/common';

@Injectable()
export class FileValidationService {
    private readonly validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];

    isValidVideoFile(filename: string): boolean {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return this.validExtensions.includes(ext);
    }
}