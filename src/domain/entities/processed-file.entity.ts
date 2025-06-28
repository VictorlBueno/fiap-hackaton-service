export class ProcessedFile {
    constructor(
        public readonly filename: string,
        public readonly size: number,
        public readonly createdAt: Date,
        public readonly downloadUrl: string
    ) {}

    getFormattedSize(): string {
        if (this.size === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(this.size) / Math.log(k));
        return parseFloat((this.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFormattedDate(): string {
        return this.createdAt.toISOString().replace('T', ' ').substring(0, 19);
    }
}