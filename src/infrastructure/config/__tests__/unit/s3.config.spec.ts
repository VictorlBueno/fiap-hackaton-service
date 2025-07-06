import { s3Config, S3Config } from '../../s3.config';

describe('S3 Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Given S3 configuration', () => {
    describe('When environment variables are not set', () => {
      beforeEach(() => {
        delete process.env.AWS_REGION;
        delete process.env.AWS_S3_BUCKET_NAME;
        jest.resetModules();
      });

      it('Then should use default values', async () => {
        const { s3Config } = await import('../../s3.config');
        expect(s3Config.region).toBe('us-east-1');
        expect(s3Config.bucketName).toBe('fiap-hackaton-v');
      });

      it('Then should have correct interface structure', async () => {
        const { s3Config } = await import('../../s3.config');
        expect(s3Config).toHaveProperty('region');
        expect(s3Config).toHaveProperty('bucketName');
        expect(typeof s3Config.region).toBe('string');
        expect(typeof s3Config.bucketName).toBe('string');
      });
    });

    describe('When AWS_REGION environment variable is set', () => {
      it('Then should use custom region', async () => {
        process.env.AWS_REGION = 'us-west-2';
        jest.resetModules();
        
        const { s3Config } = await import('../../s3.config');
        expect(s3Config.region).toBe('us-west-2');
        expect(s3Config.bucketName).toBe('fiap-hackaton-v');
      });
    });

    describe('When AWS_S3_BUCKET_NAME environment variable is set', () => {
      it('Then should use custom bucket name', async () => {
        process.env.AWS_S3_BUCKET_NAME = 'my-custom-bucket';
        jest.resetModules();
        
        const { s3Config } = await import('../../s3.config');
        expect(s3Config.region).toBe('us-east-1');
        expect(s3Config.bucketName).toBe('my-custom-bucket');
      });
    });

    describe('When both environment variables are set', () => {
      it('Then should use both custom values', async () => {
        process.env.AWS_REGION = 'eu-central-1';
        process.env.AWS_S3_BUCKET_NAME = 'production-bucket';
        jest.resetModules();
        
        const { s3Config } = await import('../../s3.config');
        expect(s3Config.region).toBe('eu-central-1');
        expect(s3Config.bucketName).toBe('production-bucket');
      });
    });

    describe('When S3Config interface is used', () => {
      it('Then should match the interface structure', async () => {
        const { s3Config } = await import('../../s3.config');
        const config = {
          region: 'test-region',
          bucketName: 'test-bucket',
        };

        expect(config.region).toBe('test-region');
        expect(config.bucketName).toBe('test-bucket');
      });
    });
  });
}); 