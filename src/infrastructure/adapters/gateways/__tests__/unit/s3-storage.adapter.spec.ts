import { Test, TestingModule } from '@nestjs/testing';
import { S3StorageAdapter } from '../../s3-storage.adapter';

// Mock manual para fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  unlink: jest.fn(),
  access: jest.fn(),
}));

// Mock manual para @aws-sdk/client-s3
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    HeadObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
  };
});

// Mock manual para @aws-sdk/s3-request-presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// Mock manual para fs
let mockCreateWriteStream;
jest.mock('fs', () => ({
  createWriteStream: (...args) => mockCreateWriteStream(...args),
}));

// Mock manual para archiver
let mockArchive;
jest.mock('archiver', () => () => mockArchive);

describe('S3StorageAdapter', () => {
  let adapter: any;
  let mockS3Client: any;
  let mockFs: any;
  let mockGetSignedUrl: any;
  let s3ClientModule: any;

  let originalFileExists;
  beforeEach(async () => {
    jest.clearAllMocks();
    s3ClientModule = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const fs = require('fs/promises');
    const { S3StorageAdapter } = require('../../s3-storage.adapter');

    mockS3Client = { send: jest.fn() };
    s3ClientModule.S3Client.mockImplementation(() => mockS3Client);
    mockFs = fs;
    mockGetSignedUrl = getSignedUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [S3StorageAdapter],
    }).compile();
    adapter = module.get(S3StorageAdapter);
    originalFileExists = adapter.fileExists;
  });
  afterEach(() => {
    adapter.fileExists = originalFileExists;
  });

  describe('Given S3StorageAdapter initialization', () => {
    describe('When adapter is created', () => {
      it('Then should create S3 client with correct configuration', () => {
        expect(s3ClientModule.S3Client).toHaveBeenCalledWith({
          region: 'us-east-1',
        });
      });
    });
  });

  describe('Given S3StorageAdapter file deletion', () => {
    describe('When deleting local file', () => {
      beforeEach(() => {
        mockFs.unlink.mockResolvedValue(undefined);
      });

      it('Then should delete local uploads file', async () => {
        await adapter.deleteFile('uploads/test-file.mp4');
        expect(mockFs.unlink).toHaveBeenCalledWith('uploads/test-file.mp4');
        expect(mockS3Client.send).not.toHaveBeenCalled();
      });

      it('Then should delete local temp file', async () => {
        await adapter.deleteFile('temp/test-file.mp4');
        expect(mockFs.unlink).toHaveBeenCalledWith('temp/test-file.mp4');
        expect(mockS3Client.send).not.toHaveBeenCalled();
      });
    });

    describe('When deleting S3 file', () => {
      beforeEach(() => {
        mockS3Client.send.mockResolvedValue({});
      });

      it('Then should delete file from S3', async () => {
        await adapter.deleteFile('s3://bucket/test-file.mp4');
        expect(mockS3Client.send).toHaveBeenCalled();
      });
    });

    describe('When deletion fails', () => {
      beforeEach(() => {
        mockFs.unlink.mockRejectedValue(new Error('File not found'));
      });

      it('Then should handle error gracefully', async () => {
        await expect(adapter.deleteFile('uploads/nonexistent.mp4')).resolves.toBeUndefined();
      });
    });
  });

  describe('Given S3StorageAdapter file upload', () => {
    describe('When uploading file successfully', () => {
      const mockFileBuffer = Buffer.from('test content');
      beforeEach(() => {
        mockFs.readFile.mockResolvedValue(mockFileBuffer);
        mockS3Client.send.mockResolvedValue({});
      });
      it('Then should upload file to S3', async () => {
        const result = await adapter.uploadFile('/local/path/video.mp4', 'uploads/video.mp4');
        expect(mockFs.readFile).toHaveBeenCalledWith('/local/path/video.mp4');
        expect(mockS3Client.send).toHaveBeenCalled();
        expect(result).toBe('uploads/video.mp4');
      });
    });
    describe('When upload fails with endpoint error', () => {
      beforeEach(() => {
        mockFs.readFile.mockResolvedValue(Buffer.from('test'));
        mockS3Client.send.mockRejectedValue(new Error('endpoint error'));
      });
      it('Then should throw region error', async () => {
        await expect(adapter.uploadFile('/local/path/video.mp4', 'uploads/video.mp4')).rejects.toThrow(
          'Erro de região S3: O bucket \'fiap-hackaton-v\' não está na região \'us-east-1\'. Verifique a configuração AWS_REGION.'
        );
      });
    });
    describe('When upload fails with other error', () => {
      beforeEach(() => {
        mockFs.readFile.mockResolvedValue(Buffer.from('test'));
        mockS3Client.send.mockRejectedValue(new Error('S3 error'));
      });
      it('Then should throw generic error', async () => {
        await expect(adapter.uploadFile('/local/path/video.mp4', 'uploads/video.mp4')).rejects.toThrow(
          'Erro ao fazer upload para S3: S3 error'
        );
      });
    });
  });

  describe('Given S3StorageAdapter file existence check', () => {
    describe('When checking local uploads file', () => {
      beforeEach(() => {
        mockFs.access.mockResolvedValue(undefined);
      });
      it('Then should return true for existing local file', async () => {
        const result = await adapter.fileExists('uploads/2024-01-01T12:00:00Z_video.mp4');
        expect(mockFs.access).toHaveBeenCalledWith('uploads/2024-01-01T12:00:00Z_video.mp4');
        expect(result).toBe(true);
      });
    });
    describe('When checking local temp file', () => {
      beforeEach(() => {
        mockFs.access.mockResolvedValue(undefined);
      });
      it('Then should return true for existing temp file', async () => {
        const result = await adapter.fileExists('temp/frame_001.png');
        expect(mockFs.access).toHaveBeenCalledWith('temp/frame_001.png');
        expect(result).toBe(true);
      });
    });
    describe('When checking S3 file', () => {
      beforeEach(() => {
        mockS3Client.send.mockResolvedValue({});
      });
      it('Then should return true for existing S3 file', async () => {
        const result = await adapter.fileExists('s3://bucket/file.mp4');
        expect(mockS3Client.send).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });
    describe('When file does not exist', () => {
      beforeEach(() => {
        mockFs.access.mockRejectedValue(new Error('File not found'));
        mockS3Client.send.mockRejectedValue(new Error('Not found'));
      });
      it('Then should return false for non-existent local file', async () => {
        const result = await adapter.fileExists('uploads/nonexistent.mp4');
        expect(result).toBe(false);
      });
    });
    describe('When S3 file does not exist', () => {
      beforeEach(() => {
        mockS3Client.send.mockRejectedValue(new Error('Not found'));
      });
      it('Then should return false for non-existent S3 file', async () => {
        const result = await adapter.fileExists('s3://bucket/nonexistent.mp4');
        expect(result).toBe(false);
      });
    });
  });

  describe('Given S3StorageAdapter signed URL generation', () => {
    describe('When generating signed URL successfully', () => {
      beforeEach(() => {
        mockS3Client.send.mockResolvedValue({});
        mockGetSignedUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');
      });
      it('Then should generate signed URL', async () => {
        const result = await adapter.getSignedDownloadUrl('uploads/video.mp4');
        expect(mockGetSignedUrl).toHaveBeenCalled();
        expect(result).toBe('https://s3.amazonaws.com/signed-url');
      });
      it('Then should use custom expiration time', async () => {
        await adapter.getSignedDownloadUrl('uploads/video.mp4', 7200);
        expect(mockGetSignedUrl).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          { expiresIn: 7200 }
        );
      });
    });
    describe('When file does not exist', () => {
      beforeEach(() => {
        mockS3Client.send.mockRejectedValue(new Error('Not found'));
      });
      it('Then should throw error', async () => {
        await expect(adapter.getSignedDownloadUrl('uploads/nonexistent.mp4')).rejects.toThrow(
          'Arquivo não encontrado no S3: uploads/nonexistent.mp4'
        );
      });
    });
    describe('When signed URL generation fails', () => {
      beforeEach(() => {
        mockS3Client.send.mockResolvedValue({});
        mockGetSignedUrl.mockRejectedValue(new Error('URL generation failed'));
      });
      it('Then should throw error', async () => {
        await expect(adapter.getSignedDownloadUrl('uploads/video.mp4')).rejects.toThrow(
          'Erro ao gerar URL assinada: URL generation failed'
        );
      });
    });
  });

  describe('Given S3StorageAdapter S3 key generation', () => {
    describe('When getting S3 key for different file paths', () => {
      it('Then should return uploads path as is', () => {
        const result = (adapter as any).getS3Key('uploads/video.mp4');
        expect(result).toBe('uploads/video.mp4');
      });
      it('Then should return outputs path as is', () => {
        const result = (adapter as any).getS3Key('outputs/frames.zip');
        expect(result).toBe('outputs/frames.zip');
      });
      it('Then should return basename for temp files', () => {
        const result = (adapter as any).getS3Key('temp/frame_001.png');
        expect(result).toBe('frame_001.png');
      });
      it('Then should return path as is for other files', () => {
        const result = (adapter as any).getS3Key('other/path/file.txt');
        expect(result).toBe('other/path/file.txt');
      });
    });
  });

  describe('Given S3StorageAdapter zip creation', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      mockCreateWriteStream = jest.fn(() => ({
        on: jest.fn(function (event, cb) {
          if (event === 'close') setTimeout(cb, 0);
          return this;
        }),
        once: jest.fn(),
        end: jest.fn(),
        emit: jest.fn(),
        pipe: jest.fn(),
      }));
      mockArchive = {
        pipe: jest.fn(),
        file: jest.fn(),
        finalize: jest.fn(),
        on: jest.fn(function (event, cb) {
          if (event === 'close') setTimeout(cb, 0);
          return this;
        }),
      };
    });
    
    it('Then should throw if no files are added', async () => {
      adapter.fileExists = jest.fn(() => Promise.resolve(false));
      mockCreateWriteStream = jest.fn(() => ({
        on: jest.fn(function (event, cb) {
          if (event === 'close') setTimeout(cb, 0);
          return this;
        }),
        once: jest.fn(),
        end: jest.fn(),
        emit: jest.fn(),
        pipe: jest.fn(),
      }));
      await expect(adapter.createZip(['uploads/none.txt'], 'outputs/empty.zip')).rejects.toThrow('Nenhum arquivo foi adicionado ao ZIP');
    });
    it('Then should reject on archiver error', async () => {
      const mockFiles = ['uploads/file1.txt'];
      let errorCb;
      mockArchive.on = jest.fn(function (event, cb) {
        if (event === 'error') errorCb = cb;
        if (event === 'close') setTimeout(cb, 0);
        return this;
      });
      mockArchive.file.mockImplementation(() => mockArchive);
      mockArchive.finalize.mockImplementation(() => {
        if (errorCb) errorCb(new Error('zip error'));
        return undefined;
      });
      const promise = adapter.createZip(mockFiles, 'outputs/test.zip');
      await expect(promise).rejects.toThrow('zip error');
    });
  });

  describe('Given S3StorageAdapter file download', () => {
    it('Then should download file from S3 and write to local path', async () => {
      jest.setTimeout(10000);
      const mockS3Stream = new (require('stream').Readable)();
      mockS3Stream._read = () => {};
      const mockWriteStream = {
        on: jest.fn(function(event, cb) { if (event === 'finish') setTimeout(cb, 0); return this; }),
        once: jest.fn(),
        end: jest.fn(),
        emit: jest.fn(),
        pipe: jest.fn(),
      };
      mockCreateWriteStream.mockReturnValue(mockWriteStream);
      mockS3Stream.pipe = jest.fn(function(dest) {
        setTimeout(() => dest.emit('finish'), 0);
        return dest;
      });
      adapter.s3Client.send.mockResolvedValue({ Body: mockS3Stream });
      await expect(adapter.downloadFile('uploads/file.mp4', 'local/file.mp4')).resolves.toBeUndefined();
      expect(adapter.s3Client.send).toHaveBeenCalled();
      expect(mockCreateWriteStream).toHaveBeenCalledWith('local/file.mp4');
    });
    it('Then should throw if S3 returns error', async () => {
      adapter.s3Client.send.mockRejectedValue(new Error('S3 error'));
      await expect(adapter.downloadFile('uploads/file.mp4', 'local/file.mp4')).rejects.toThrow('Erro ao baixar arquivo do S3: S3 error');
    });
  });

  describe('Given S3StorageAdapter file stream', () => {
    it('Then should return a readable stream from S3', async () => {
      const mockS3Stream = new (require('stream').Readable)();
      mockS3Stream._read = () => {};
      adapter.s3Client.send.mockResolvedValue({ Body: mockS3Stream });
      const result = await adapter.getFileStream('uploads/file.mp4');
      expect(result).toBe(mockS3Stream);
      expect(adapter.s3Client.send).toHaveBeenCalled();
    });
    it('Then should throw if Body is not a stream', async () => {
      adapter.s3Client.send.mockResolvedValue({ Body: 'not-a-stream' });
      await expect(adapter.getFileStream('uploads/file.mp4')).rejects.toThrow('Body não é um stream');
    });
  });
}); 