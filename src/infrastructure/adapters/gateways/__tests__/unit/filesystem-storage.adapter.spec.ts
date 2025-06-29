import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as archiver from 'archiver';
import * as path from 'path';
import { EventEmitter } from 'events';
import {FilesystemStorageAdapter} from "../../filesystem-storage.adapter";

jest.mock('fs/promises');
jest.mock('fs');
jest.mock('archiver');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockFsSync = fsSync as jest.Mocked<typeof fsSync>;
const mockArchiver = archiver as jest.MockedFunction<typeof archiver>;
const mockPath = path as jest.Mocked<typeof path>;

describe('FilesystemStorageAdapter - Unit Tests', () => {
    let adapter: FilesystemStorageAdapter;
    let mockWriteStream: jest.Mocked<EventEmitter>;
    let mockArchive: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FilesystemStorageAdapter],
        }).compile();

        adapter = module.get<FilesystemStorageAdapter>(FilesystemStorageAdapter);

        mockWriteStream = new EventEmitter() as jest.Mocked<EventEmitter>;
        mockArchive = new EventEmitter() as jest.Mocked<EventEmitter>;
        mockArchive.pipe = jest.fn();
        mockArchive.file = jest.fn();
        mockArchive.finalize = jest.fn();

        jest.clearAllMocks();
        mockPath.basename.mockImplementation((filePath) => filePath.split('/').pop() || '');
    });

    describe('Given FilesystemStorageAdapter', () => {
        describe('When deleting file successfully', () => {
            const filePath = '/uploads/video.mp4';

            beforeEach(() => {
                mockFs.unlink.mockResolvedValue(undefined);
            });

            it('Then should remove file from filesystem', async () => {
                await adapter.deleteFile(filePath);

                expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
                expect(mockFs.unlink).toHaveBeenCalledTimes(1);
            });

            it('Then should not throw error on successful deletion', async () => {
                await expect(adapter.deleteFile(filePath)).resolves.toBeUndefined();
            });
        });

        describe('When file deletion fails', () => {
            const filePath = '/nonexistent/file.mp4';
            const deletionError = new Error('File not found');

            beforeEach(() => {
                mockFs.unlink.mockRejectedValue(deletionError);
            });

            it('Then should not throw error but handle gracefully', async () => {
                await expect(adapter.deleteFile(filePath)).resolves.toBeUndefined();

                expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
            });

            it('Then should attempt deletion regardless of error', async () => {
                await adapter.deleteFile(filePath);

                expect(mockFs.unlink).toHaveBeenCalledTimes(1);
            });
        });

        describe('When creating zip file successfully', () => {
            const files = ['/temp/frame1.png', '/temp/frame2.png', '/temp/frame3.png'];
            const outputPath = '/output/frames.zip';

            beforeEach(() => {
                mockFsSync.createWriteStream.mockReturnValue(mockWriteStream as any);
                mockArchiver.mockReturnValue(mockArchive as any);
            });

            it('Then should create zip with all files', async () => {
                const zipPromise = adapter.createZip(files, outputPath);

                mockWriteStream.emit('close');

                await zipPromise;

                expect(mockFsSync.createWriteStream).toHaveBeenCalledWith(outputPath);
                expect(mockArchiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
                expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
                expect(mockArchive.finalize).toHaveBeenCalledTimes(1);
            });

            it('Then should add each file to archive with basename', async () => {
                const zipPromise = adapter.createZip(files, outputPath);

                mockWriteStream.emit('close');

                await zipPromise;

                files.forEach((file, index) => {
                    const expectedBasename = file.split('/').pop();
                    expect(mockArchive.file).toHaveBeenNthCalledWith(index + 1, file, { name: expectedBasename });
                });
            });

            it('Then should complete successfully when stream closes', async () => {
                const zipPromise = adapter.createZip(files, outputPath);

                mockWriteStream.emit('close');

                await expect(zipPromise).resolves.toBeUndefined();
            });
        });

        describe('When zip creation fails', () => {
            const files = ['/temp/frame1.png'];
            const outputPath = '/output/frames.zip';
            const archiveError = new Error('Archive creation failed');

            beforeEach(() => {
                mockFsSync.createWriteStream.mockReturnValue(mockWriteStream as any);
                mockArchiver.mockReturnValue(mockArchive as any);
            });

            it('Then should reject with archive error', async () => {
                const zipPromise = adapter.createZip(files, outputPath);

                mockArchive.emit('error', archiveError);

                await expect(zipPromise).rejects.toThrow('Archive creation failed');
            });

            it('Then should setup archive before error occurs', async () => {
                const zipPromise = adapter.createZip(files, outputPath);

                expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
                expect(mockArchive.file).toHaveBeenCalledWith(files[0], { name: 'frame1.png' });

                mockArchive.emit('error', archiveError);

                await expect(zipPromise).rejects.toThrow();
            });
        });

        describe('When creating zip with empty files array', () => {
            const files: string[] = [];
            const outputPath = '/output/empty.zip';

            beforeEach(() => {
                mockFsSync.createWriteStream.mockReturnValue(mockWriteStream as any);
                mockArchiver.mockReturnValue(mockArchive as any);
            });

            it('Then should create empty zip file', async () => {
                const zipPromise = adapter.createZip(files, outputPath);

                mockWriteStream.emit('close');

                await zipPromise;

                expect(mockArchive.file).not.toHaveBeenCalled();
                expect(mockArchive.finalize).toHaveBeenCalledTimes(1);
            });
        });

        describe('When checking if file exists', () => {
            const existingFile = '/uploads/existing.mp4';

            beforeEach(() => {
                mockFs.access.mockResolvedValue(undefined);
            });

            it('Then should return true for existing file', async () => {
                const result = await adapter.fileExists(existingFile);

                expect(result).toBe(true);
                expect(mockFs.access).toHaveBeenCalledWith(existingFile);
            });

            it('Then should use fs.access to check file', async () => {
                await adapter.fileExists(existingFile);

                expect(mockFs.access).toHaveBeenCalledTimes(1);
            });
        });

        describe('When checking non-existent file', () => {
            const nonExistentFile = '/uploads/missing.mp4';

            beforeEach(() => {
                mockFs.access.mockRejectedValue(new Error('File not found'));
            });

            it('Then should return false for non-existent file', async () => {
                const result = await adapter.fileExists(nonExistentFile);

                expect(result).toBe(false);
                expect(mockFs.access).toHaveBeenCalledWith(nonExistentFile);
            });

            it('Then should handle access error gracefully', async () => {
                await expect(adapter.fileExists(nonExistentFile)).resolves.toBe(false);
            });
        });

        describe('When checking file with permission error', () => {
            const restrictedFile = '/root/restricted.mp4';

            beforeEach(() => {
                mockFs.access.mockRejectedValue(new Error('Permission denied'));
            });

            it('Then should return false for permission errors', async () => {
                const result = await adapter.fileExists(restrictedFile);

                expect(result).toBe(false);
            });
        });

        describe('When creating zip with single file', () => {
            const singleFile = ['/temp/single-frame.png'];
            const outputPath = '/output/single.zip';

            beforeEach(() => {
                mockFsSync.createWriteStream.mockReturnValue(mockWriteStream as any);
                mockArchiver.mockReturnValue(mockArchive as any);
            });

            it('Then should create zip with one file', async () => {
                const zipPromise = adapter.createZip(singleFile, outputPath);

                mockWriteStream.emit('close');

                await zipPromise;

                expect(mockArchive.file).toHaveBeenCalledTimes(1);
                expect(mockArchive.file).toHaveBeenCalledWith(singleFile[0], { name: 'single-frame.png' });
            });
        });

        describe('When dealing with files with complex paths', () => {
            const complexFiles = [
                '/very/deep/nested/path/frame.png',
                '/another/complex/directory/structure/image.png'
            ];
            const outputPath = '/output/complex.zip';

            beforeEach(() => {
                mockFsSync.createWriteStream.mockReturnValue(mockWriteStream as any);
                mockArchiver.mockReturnValue(mockArchive as any);
            });

            it('Then should use only basename for zip entries', async () => {
                const zipPromise = adapter.createZip(complexFiles, outputPath);

                mockWriteStream.emit('close');

                await zipPromise;

                expect(mockArchive.file).toHaveBeenCalledWith(complexFiles[0], { name: 'frame.png' });
                expect(mockArchive.file).toHaveBeenCalledWith(complexFiles[1], { name: 'image.png' });
            });
        });

        describe('When deleting multiple files sequentially', () => {
            const files = ['/temp/file1.txt', '/temp/file2.txt', '/temp/file3.txt'];

            beforeEach(() => {
                mockFs.unlink.mockResolvedValue(undefined);
            });

            it('Then should delete each file independently', async () => {
                await Promise.all(files.map(file => adapter.deleteFile(file)));

                files.forEach(file => {
                    expect(mockFs.unlink).toHaveBeenCalledWith(file);
                });
                expect(mockFs.unlink).toHaveBeenCalledTimes(3);
            });
        });
    });
});