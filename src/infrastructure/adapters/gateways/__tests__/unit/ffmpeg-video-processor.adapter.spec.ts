import { Test, TestingModule } from '@nestjs/testing';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import {FfmpegVideoProcessorAdapter} from "../../ffmpeg-video-processor.adapter";

jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('path');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('FfmpegVideoProcessorAdapter - Unit Tests', () => {
    let adapter: FfmpegVideoProcessorAdapter;

    const videoPath = '/uploads/video.mp4';
    const outputDir = '/temp/frames';
    const framePattern = '/temp/frames/frame_%04d.png';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FfmpegVideoProcessorAdapter],
        }).compile();

        adapter = module.get<FfmpegVideoProcessorAdapter>(FfmpegVideoProcessorAdapter);

        jest.clearAllMocks();
        mockPath.join.mockImplementation((...paths) => paths.join('/'));
        mockPath.basename.mockImplementation((filePath) => filePath.split('/').pop() || '');
    });

    describe('Given FfmpegVideoProcessorAdapter', () => {
        describe('When extracting frames successfully', () => {
            const mockFrameFiles = ['frame_0001.png', 'frame_0002.png', 'frame_0003.png'];
            const expectedFramePaths = mockFrameFiles.map(file => `/temp/frames/${file}`);

            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    if (command === 'ffmpeg -version') {
                        // @ts-ignore
                        callback(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
                    } else {
                        // @ts-ignore
                        callback(null, { stdout: 'frames extracted', stderr: '' });
                    }
                    return {} as any;
                });

                mockFs.mkdir.mockResolvedValue(undefined);
                mockFs.readdir.mockResolvedValue(mockFrameFiles as any);
                mockFs.access.mockResolvedValue(undefined);
                mockFs.stat.mockResolvedValue({ size: 2048 } as any);
            });

            it('Then should return array of frame file paths', async () => {
                const result = await adapter.extractFrames(videoPath, outputDir);

                expect(result).toEqual(expectedFramePaths);
                expect(result).toHaveLength(3);
            });

            it('Then should check ffmpeg availability first', async () => {
                await adapter.extractFrames(videoPath, outputDir);

                expect(mockExec).toHaveBeenCalledWith('ffmpeg -version', expect.any(Function));
            });

            it('Then should create output directory recursively', async () => {
                await adapter.extractFrames(videoPath, outputDir);

                expect(mockFs.mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });
            });

            it('Then should execute ffmpeg with correct command', async () => {
                await adapter.extractFrames(videoPath, outputDir);

                const expectedCommand = `ffmpeg -i "${videoPath}" -vf fps=1 -y "${framePattern}"`;
                expect(mockExec).toHaveBeenCalledWith(expectedCommand, expect.any(Function));
            });

            it('Then should verify each extracted frame exists', async () => {
                await adapter.extractFrames(videoPath, outputDir);

                expectedFramePaths.forEach(framePath => {
                    expect(mockFs.access).toHaveBeenCalledWith(framePath);
                    expect(mockFs.stat).toHaveBeenCalledWith(framePath);
                });
            });

            it('Then should filter only PNG files from directory', async () => {
                const allFiles = ['frame_0001.png', 'frame_0002.png', 'other.txt', 'readme.md'];
                mockFs.readdir.mockResolvedValue(allFiles as any);

                const result = await adapter.extractFrames(videoPath, outputDir);

                expect(result).toHaveLength(2);
                expect(result.every(file => file.endsWith('.png'))).toBe(true);
            });
        });

        describe('When ffmpeg is not installed', () => {
            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    if (command === 'ffmpeg -version') {
                        // @ts-ignore
                        callback(new Error('ffmpeg: command not found'), { stdout: '', stderr: 'command not found' });
                    }
                    return {} as any;
                });
            });

            it('Then should throw ffmpeg installation error', async () => {
                await expect(adapter.extractFrames(videoPath, outputDir)).rejects.toThrow(
                    'FFmpeg não encontrado. Instale: sudo apt install ffmpeg'
                );
            });

            it('Then should not attempt directory creation or frame extraction', async () => {
                await expect(adapter.extractFrames(videoPath, outputDir)).rejects.toThrow();

                expect(mockFs.mkdir).not.toHaveBeenCalled();
            });
        });

        describe('When ffmpeg command fails', () => {
            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    if (command === 'ffmpeg -version') {
                        // @ts-ignore
                        callback(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
                    } else {
                        // @ts-ignore
                        callback(new Error('Codec not supported'), { stdout: '', stderr: 'codec error' });
                    }
                    return {} as any;
                });

                mockFs.mkdir.mockResolvedValue(undefined);
                mockFs.rm.mockResolvedValue(undefined);
            });

            it('Then should throw processing error', async () => {
                await expect(adapter.extractFrames(videoPath, outputDir)).rejects.toThrow(
                    'Erro no processamento: Codec not supported'
                );
            });

            it('Then should cleanup output directory on failure', async () => {
                await expect(adapter.extractFrames(videoPath, outputDir)).rejects.toThrow();

                expect(mockFs.rm).toHaveBeenCalledWith(outputDir, { recursive: true, force: true });
            });
        });

        describe('When ffmpeg not found error occurs', () => {
            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    if (command === 'ffmpeg -version') {
                        // @ts-ignore
                        callback(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
                    } else {
                        // @ts-ignore
                        callback(new Error('ffmpeg not found in PATH'), { stdout: '', stderr: '' });
                    }
                    return {} as any;
                });

                mockFs.mkdir.mockResolvedValue(undefined);
                mockFs.rm.mockResolvedValue(undefined);
            });

            it('Then should throw specific ffmpeg installation error', async () => {
                await expect(adapter.extractFrames(videoPath, outputDir)).rejects.toThrow(
                    'FFmpeg não está instalado'
                );
            });
        });

        describe('When no frames are extracted', () => {
            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    if (command === 'ffmpeg -version') {
                        // @ts-ignore
                        callback(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
                    } else {
                        // @ts-ignore
                        callback(null, { stdout: 'completed', stderr: '' });
                    }
                    return {} as any;
                });

                mockFs.mkdir.mockResolvedValue(undefined);
                mockFs.readdir.mockResolvedValue([]);
            });

            it('Then should return empty array', async () => {
                const result = await adapter.extractFrames(videoPath, outputDir);

                expect(result).toEqual([]);
                expect(result).toHaveLength(0);
            });
        });

        describe('When directory creation fails', () => {
            const directoryError = new Error('Permission denied');

            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    // @ts-ignore
                    callback(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
                    return {} as any;
                });

                mockFs.mkdir.mockRejectedValue(directoryError);
            });

            it('Then should propagate directory creation error', async () => {
                await expect(adapter.extractFrames(videoPath, outputDir)).rejects.toThrow('Permission denied');
            });
        });

        describe('When file verification fails', () => {
            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    if (command === 'ffmpeg -version') {
                        // @ts-ignore
                        callback(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
                    } else {
                        // @ts-ignore
                        callback(null, { stdout: 'frames extracted', stderr: '' });
                    }
                    return {} as any;
                });

                mockFs.mkdir.mockResolvedValue(undefined);
                mockFs.readdir.mockResolvedValue(['frame_0001.png'] as any);
                mockFs.access.mockRejectedValue(new Error('File not found'));
                mockFs.stat.mockResolvedValue({ size: 2048 } as any);
            });

            it('Then should continue processing despite verification errors', async () => {
                const result = await adapter.extractFrames(videoPath, outputDir);

                expect(result).toEqual(['/temp/frames/frame_0001.png']);
                expect(mockFs.access).toHaveBeenCalled();
            });
        });

        describe('When output directory contains mixed files', () => {
            const mixedFiles = ['frame_0001.png', 'frame_0002.png', 'temp.txt', 'config.json', 'frame_0003.png'];

            beforeEach(() => {
                mockExec.mockImplementation((command, callback) => {
                    if (command === 'ffmpeg -version') {
                        // @ts-ignore
                        callback(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
                    } else {
                        // @ts-ignore
                        callback(null, { stdout: 'frames extracted', stderr: '' });
                    }
                    return {} as any;
                });

                mockFs.mkdir.mockResolvedValue(undefined);
                mockFs.readdir.mockResolvedValue(mixedFiles as any);
                mockFs.access.mockResolvedValue(undefined);
                mockFs.stat.mockResolvedValue({ size: 1024 } as any);
            });

            it('Then should return only PNG frame files', async () => {
                const result = await adapter.extractFrames(videoPath, outputDir);

                expect(result).toHaveLength(3);
                expect(result).toEqual([
                    '/temp/frames/frame_0001.png',
                    '/temp/frames/frame_0002.png',
                    '/temp/frames/frame_0003.png'
                ]);
            });
        });
    });
});