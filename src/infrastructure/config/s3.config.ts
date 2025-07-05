export interface S3Config {
  region: string;
  bucketName: string;
}

export const s3Config: S3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucketName: process.env.AWS_S3_BUCKET_NAME || 'fiap-hackaton-v',
}; 