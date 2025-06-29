export interface VideoProcessorPort {
  extractFrames(videoPath: string, outputDir: string): Promise<string[]>;
}
