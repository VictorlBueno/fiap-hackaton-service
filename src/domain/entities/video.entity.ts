export class Video {
    constructor(
        public readonly id: string,
        public readonly originalName: string,
        public readonly path: string,
        public readonly size: number,
        public readonly createdAt: Date = new Date()
    ) {}

    static create(originalName: string, path: string, size: number): Video {
        const id = new Date().toISOString().replace(/[:.]/g, '-');
        return new Video(id, originalName, path, size);
    }

    isValidFormat(): boolean {
        const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];
        const ext = this.originalName.toLowerCase().substring(this.originalName.lastIndexOf('.'));
        return validExtensions.includes(ext);
    }

    getOutputZipName(): string {
        return `frames_${this.id}.zip`;
    }
}