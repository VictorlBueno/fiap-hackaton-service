export class ProcessedFile {
  constructor(
    public readonly filename: string,
    public readonly size: number,
    public readonly createdAt: Date,
    public readonly downloadUrl: string,
  ) {}
}
