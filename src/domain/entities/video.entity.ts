import { v4 as uuidv4 } from 'uuid';

export class Video {
  constructor(
    public readonly id: string,
    public readonly originalName: string,
    public readonly path: string,
    public readonly size: number,
    public readonly userId: string,
    public readonly createdAt: Date = new Date(),
  ) {}

  static create(
    originalName: string,
    path: string,
    size: number,
    userId: string,
  ): Video {
    const id = uuidv4();
    return new Video(id, originalName, path, size, userId);
  }

  isValidFormat(): boolean {
    const validExtensions = [
      '.mp4',
      '.avi',
      '.mov',
      '.mkv',
      '.wmv',
      '.flv',
      '.webm',
    ];
    const ext = this.originalName
      .toLowerCase()
      .substring(this.originalName.lastIndexOf('.'));
    return validExtensions.includes(ext);
  }
}
