import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import {VideoController} from "../../video.controller";
import {UploadVideoUseCase} from "../../../../../application/usecases/upload-video.usecase";
import {GetJobStatusUseCase} from "../../../../../application/usecases/get-job-status.usecase";
import {ListAllJobsUseCase} from "../../../../../application/usecases/list-all-job-usecase";
import {ProcessingJob} from "../../../../../domain/entities/processing-job.entity";
import {AuthenticatedRequest} from "../../../../middleware/jwt-auth.middleware";

jest.mock('fs/promises');
jest.mock('path');
jest.mock('multer', () => ({
    diskStorage: jest.fn(() => ({})),
}));

jest.mock('@nestjs/platform-express', () => ({
    FileInterceptor: jest.fn().mockImplementation(() => {
        return jest.fn();
    }),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('VideoController - Unit Tests', () => {
    let controller: VideoController;
    let uploadVideoUseCase: jest.Mocked<UploadVideoUseCase>;
    let getJobStatusUseCase: jest.Mocked<GetJobStatusUseCase>;
    let listAllJobsUseCase: jest.Mocked<ListAllJobsUseCase>;

    const mockFile: Express.Multer.File = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from('test'),
        size: 1000,
        destination: 'uploads',
        filename: 'test.mp4',
        path: '/uploads/test.mp4',
        stream: null as any,
    };

    const mockRequest: AuthenticatedRequest = {
        userId: 'user-123',
    } as AuthenticatedRequest;

    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        sendFile: jest.fn().mockReturnThis(),
    } as any as jest.Mocked<Response>;

    beforeEach(async () => {
        const mockUploadVideoUseCase = {
          execute: jest.fn(),
        } as unknown as jest.Mocked<UploadVideoUseCase>;

        const mockGetJobStatusUseCase = {
          execute: jest.fn(),
        } as unknown as jest.Mocked<GetJobStatusUseCase>;

        const mockListAllJobsUseCase = {
          execute: jest.fn(),
        } as unknown as jest.Mocked<ListAllJobsUseCase>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [VideoController],
            providers: [
                { provide: UploadVideoUseCase, useValue: mockUploadVideoUseCase },
                { provide: GetJobStatusUseCase, useValue: mockGetJobStatusUseCase },
                { provide: ListAllJobsUseCase, useValue: mockListAllJobsUseCase },
            ],
        }).compile();

        controller = module.get<VideoController>(VideoController);
        uploadVideoUseCase = module.get(UploadVideoUseCase);
        getJobStatusUseCase = module.get(GetJobStatusUseCase);
        listAllJobsUseCase = module.get(ListAllJobsUseCase);

        jest.clearAllMocks();
        mockPath.join.mockImplementation((...paths) => paths.join('/'));
        mockPath.resolve.mockImplementation((filePath) => `/absolute/${filePath}`);
    });

    describe('Given VideoController upload endpoint', () => {
        describe('When uploading video successfully', () => {
            const successResponse = {
                success: true,
                message: 'Upload realizado com sucesso',
                jobId: 'job-123',
                statusUrl: '/api/job/job-123',
            };

            beforeEach(() => {
                uploadVideoUseCase.execute.mockResolvedValue(successResponse);
            });

            it('Then should return success response', async () => {
                const result = await controller.uploadVideo(mockFile, mockRequest);

                expect(result).toBe(successResponse);
                expect(uploadVideoUseCase.execute).toHaveBeenCalledWith(mockFile, 'user-123');
            });
        });

        describe('When upload fails', () => {
            const errorResponse = {
                success: false,
                message: 'Formato não suportado',
            };

            beforeEach(() => {
                uploadVideoUseCase.execute.mockResolvedValue(errorResponse);
            });

            it('Then should return error response', async () => {
                const result = await controller.uploadVideo(mockFile, mockRequest);

                expect(result).toBe(errorResponse);
                expect(uploadVideoUseCase.execute).toHaveBeenCalledTimes(1);
            });
        });

        describe('When use case throws exception', () => {
            const useCaseError = new Error('Database connection failed');

            beforeEach(() => {
                uploadVideoUseCase.execute.mockRejectedValue(useCaseError);
            });

            it('Then should return internal error response', async () => {
                const result = await controller.uploadVideo(mockFile, mockRequest);

                expect(result.success).toBe(false);
                expect(result.message).toBe('Erro interno: Database connection failed');
            });
        });
    });

    describe('Given VideoController job status endpoint', () => {
        const mockJob = ProcessingJob.createCompleted('job-123', 'video.mp4', 'user-123', 150, 'frames.zip');

        describe('When job exists and belongs to user', () => {
            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(mockJob);
            });

            it('Then should return job details', async () => {
                const result = await controller.getJobStatus('job-123', mockRequest);

                expect(result).toBe(mockJob);
                expect(getJobStatusUseCase.execute).toHaveBeenCalledWith('job-123', 'user-123');
            });
        });

        describe('When job does not exist', () => {
            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(null);
            });

            it('Then should return error message', async () => {
                const result = await controller.getJobStatus('nonexistent', mockRequest);

                expect(result).toEqual({
                    error: 'Job não encontrado ou não pertence ao usuário',
                });
            });
        });

        describe('When job belongs to different user', () => {
            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(null);
            });

            it('Then should return error message', async () => {
                const result = await controller.getJobStatus('job-123', mockRequest);

                expect(result).toEqual({
                    error: 'Job não encontrado ou não pertence ao usuário',
                });
            });
        });
    });

    describe('Given VideoController download endpoint', () => {
        const completedJob = ProcessingJob.createCompleted('job-123', 'video.mp4', 'user-123', 150, 'job-123.zip');

        describe('When downloading valid completed job file', () => {
            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(completedJob);
                mockFs.access.mockResolvedValue(undefined);
            });

            it('Then should send file with correct headers', async () => {
                await controller.downloadFile('job-123.zip', mockResponse, mockRequest);

                expect(getJobStatusUseCase.execute).toHaveBeenCalledWith('job-123', 'user-123');
                expect(mockFs.access).toHaveBeenCalledWith('outputs/job-123.zip');
                expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=job-123.zip');
                expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
                expect(mockResponse.sendFile).toHaveBeenCalledWith('/absolute/outputs/job-123.zip');
            });
        });

        describe('When job does not exist', () => {
            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(null);
            });

            it('Then should return forbidden status', async () => {
                await controller.downloadFile('job-123.zip', mockResponse, mockRequest);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: 'Arquivo não encontrado ou não pertence ao usuário',
                });
            });
        });

        describe('When job is not completed', () => {
            const pendingJob = ProcessingJob.createPending('job-456', 'video.mp4', 'user-123');

            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(pendingJob);
            });

            it('Then should return forbidden status', async () => {
                await controller.downloadFile('job-456.zip', mockResponse, mockRequest);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: 'Arquivo não encontrado ou não pertence ao usuário',
                });
            });
        });

        describe('When file does not exist physically', () => {
            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(completedJob);
                mockFs.access.mockRejectedValue(new Error('File not found'));
            });

            it('Then should return not found status', async () => {
                await controller.downloadFile('job-123.zip', mockResponse, mockRequest);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: 'Arquivo físico não encontrado',
                });
            });
        });

        describe('When job belongs to different user', () => {
            const otherUserJob = ProcessingJob.createCompleted('job-123', 'video.mp4', 'other-user', 150, 'job-123.zip');

            beforeEach(() => {
                getJobStatusUseCase.execute.mockResolvedValue(null);
            });

            it('Then should return forbidden status', async () => {
                await controller.downloadFile('job-123.zip', mockResponse, mockRequest);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
            });
        });
    });

    describe('Given VideoController status endpoint', () => {
        const mockJobs = [
            ProcessingJob.createCompleted('job-1', 'video1.mp4', 'user-123', 100, 'frames1.zip'),
            ProcessingJob.createPending('job-2', 'video2.mp4', 'user-123'),
            ProcessingJob.createFailed('job-3', 'video3.mp4', 'user-123', 'Error'),
            {
                id: 'job-4',
                videoName: 'video4.mp4',
                status: 'processing',
                message: 'Processing...',
                userId: 'user-123',
                frameCount: 50,
                zipPath: null,
                createdAt: new Date(),
            },
        ];

        describe('When getting status successfully', () => {
            beforeEach(() => {
                listAllJobsUseCase.execute.mockResolvedValue(mockJobs as any);
            });

            it('Then should return formatted jobs with summary', async () => {
                const result = await controller.getStatus(mockRequest);

                expect(listAllJobsUseCase.execute).toHaveBeenCalledWith('user-123');
                expect(result.userId).toBe('user-123');
                expect(result.jobs).toBeDefined();
                expect(result.summary).toEqual({
                    total: 4,
                    pending: 1,
                    processing: 1,
                    completed: 1,
                    failed: 1,
                    totalFrames: 150,
                });
            });

            it('Then should format jobs correctly', async () => {
                const result = await controller.getStatus(mockRequest);

                expect(result.jobs).toHaveLength(4);
                expect(result.jobs[0]).toHaveProperty('downloadUrl');
                expect(result.jobs[0]).toHaveProperty('canDownload');
                expect(result.jobs[0]).toHaveProperty('duration');
            });
        });

        describe('When listing jobs fails', () => {
            beforeEach(() => {
                listAllJobsUseCase.execute.mockRejectedValue(new Error('Database error'));
            });

            it('Then should return error response with empty data', async () => {
                const result: any = await controller.getStatus(mockRequest);

                expect(result.error).toBe('Erro ao listar jobs');
                expect(result.jobs).toEqual([]);
                expect(result.summary).toEqual({
                    total: 0,
                    pending: 0,
                    processing: 0,
                    completed: 0,
                    failed: 0,
                    totalFrames: 0,
                });
                expect(result.userId).toBe('user-123');
            });
        });

        describe('When user has no jobs', () => {
            beforeEach(() => {
                listAllJobsUseCase.execute.mockResolvedValue([]);
            });

            it('Then should return empty summary', async () => {
                const result = await controller.getStatus(mockRequest);

                expect(result.summary).toEqual({
                    total: 0,
                    pending: 0,
                    processing: 0,
                    completed: 0,
                    failed: 0,
                    totalFrames: 0,
                });
                expect(result.jobs).toEqual([]);
            });
        });
    });

    describe('Given VideoController private methods', () => {
        const testJobs = [
            { status: 'completed', frameCount: 100 },
            { status: 'pending', frameCount: null },
            { status: 'processing', frameCount: 50 },
            { status: 'failed', frameCount: null },
            { status: 'completed', frameCount: 200 },
        ];

        describe('When calculating summary', () => {
            it('Then should count each status correctly', () => {
                const summary = controller['calculateSummary'](testJobs);

                expect(summary.total).toBe(5);
                expect(summary.completed).toBe(2);
                expect(summary.pending).toBe(1);
                expect(summary.processing).toBe(1);
                expect(summary.failed).toBe(1);
                expect(summary.totalFrames).toBe(350);
            });
        });

        describe('When getting error response', () => {
            it('Then should return standardized error format', () => {
                const errorResponse = controller['getErrorResponse']('user-456');

                expect(errorResponse).toEqual({
                    error: 'Erro ao listar jobs',
                    jobs: [],
                    summary: {
                        total: 0,
                        pending: 0,
                        processing: 0,
                        completed: 0,
                        failed: 0,
                        totalFrames: 0,
                    },
                    userId: 'user-456',
                });
            });
        });
    });

    describe('Given VideoController filename handling', () => {
        describe('When extracting job ID from filename', () => {
            it('Then should remove .zip extension correctly', async () => {
                const completedJob = ProcessingJob.createCompleted('my-job-id', 'video.mp4', 'user-123', 150, 'my-job-id.zip');
                getJobStatusUseCase.execute.mockResolvedValue(completedJob);
                mockFs.access.mockResolvedValue(undefined);

                await controller.downloadFile('my-job-id.zip', mockResponse, mockRequest);

                expect(getJobStatusUseCase.execute).toHaveBeenCalledWith('my-job-id', 'user-123');
            });

            it('Then should handle complex job IDs', async () => {
                const complexJob = ProcessingJob.createCompleted('2025-01-15T16-43-36-099Z', 'video.mp4', 'user-123', 150, '2025-01-15T16-43-36-099Z.zip');
                getJobStatusUseCase.execute.mockResolvedValue(complexJob);
                mockFs.access.mockResolvedValue(undefined);

                await controller.downloadFile('2025-01-15T16-43-36-099Z.zip', mockResponse, mockRequest);

                expect(getJobStatusUseCase.execute).toHaveBeenCalledWith('2025-01-15T16-43-36-099Z', 'user-123');
            });
        });
    });
});