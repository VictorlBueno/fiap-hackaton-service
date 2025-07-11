export interface S3Config {
  region: string;
  bucketName: string;
}

if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION environment variable is required');
}

if (!process.env.S3_BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME environment variable is required');
}

export const s3Config: S3Config = {
  region: process.env.AWS_REGION,
  bucketName: process.env.S3_BUCKET_NAME,
}; 