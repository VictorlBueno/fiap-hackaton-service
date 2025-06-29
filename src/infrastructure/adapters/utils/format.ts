export default class Format {
  static formatDuration(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
    } else if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} atrás`;
    } else {
      return 'Agora mesmo';
    }
  }

  static formatJobs(jobs: any[]) {
    return jobs.map((job) => ({
      id: job.id,
      videoName: job.videoName,
      status: job.status,
      message: job.message,
      frameCount: job.frameCount,
      zipFilename: job.zipPath,
      downloadUrl:
        job.status === 'completed' && job.zipPath
          ? `/download/${job.zipPath}`
          : null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.createdAt.toISOString(),
      duration: this.formatDuration(job.createdAt),
      canDownload: job.status === 'completed' && !!job.zipPath,
    }));
  }
}
