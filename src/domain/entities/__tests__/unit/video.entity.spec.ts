import {Video} from "../../video.entity";

describe('Video', () => {
    const baseVideoData = {
        id: 'test-uuid-123',
        originalName: 'video.mp4',
        path: '/uploads/video.mp4',
        size: 1024000,
        userId: 'user-123',
    };

    describe('Given a Video constructor', () => {
        describe('When creating with all parameters', () => {
            const createdAt = new Date('2025-01-15T10:30:00Z');
            const video = new Video(
                baseVideoData.id,
                baseVideoData.originalName,
                baseVideoData.path,
                baseVideoData.size,
                baseVideoData.userId,
                createdAt,
            );

            it('Then should set all properties correctly', () => {
                expect(video.id).toBe(baseVideoData.id);
                expect(video.originalName).toBe(baseVideoData.originalName);
                expect(video.path).toBe(baseVideoData.path);
                expect(video.size).toBe(baseVideoData.size);
                expect(video.userId).toBe(baseVideoData.userId);
                expect(video.createdAt).toBe(createdAt);
            });
        });

        describe('When creating without createdAt parameter', () => {
            it('Then should use current date as default', () => {
                const beforeCreation = new Date();
                const video = new Video(
                    baseVideoData.id,
                    baseVideoData.originalName,
                    baseVideoData.path,
                    baseVideoData.size,
                    baseVideoData.userId,
                );
                const afterCreation = new Date();

                expect(video.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
                expect(video.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
            });
        });
    });

    describe('Given Video factory method', () => {
        describe('When creating a new video', () => {
            const video = Video.create(
                baseVideoData.originalName,
                baseVideoData.path,
                baseVideoData.size,
                baseVideoData.userId,
            );

            it('Then should generate UUID and set properties', () => {
                expect(video.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
                expect(video.originalName).toBe(baseVideoData.originalName);
                expect(video.path).toBe(baseVideoData.path);
                expect(video.size).toBe(baseVideoData.size);
                expect(video.userId).toBe(baseVideoData.userId);
                expect(video.createdAt).toBeInstanceOf(Date);
            });

            it('Then should generate unique IDs for different instances', () => {
                const video1 = Video.create('test1.mp4', '/path1', 1000, 'user1');
                const video2 = Video.create('test2.mp4', '/path2', 2000, 'user2');

                expect(video1.id).not.toBe(video2.id);
            });
        });
    });

    describe('Given Video format validation', () => {
        const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];

        describe('When video has valid format', () => {
            validExtensions.forEach(extension => {
                it(`Then should return true for ${extension} extension`, () => {
                    const video = Video.create(
                        `video${extension}`,
                        '/path',
                        1000,
                        'user-123',
                    );

                    expect(video.isValidFormat()).toBe(true);
                });

                it(`Then should return true for uppercase ${extension.toUpperCase()} extension`, () => {
                    const video = Video.create(
                        `VIDEO${extension.toUpperCase()}`,
                        '/path',
                        1000,
                        'user-123',
                    );

                    expect(video.isValidFormat()).toBe(true);
                });
            });

            it('Then should return true for mixed case extensions', () => {
                const video = Video.create('Video.Mp4', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(true);
            });
        });

        describe('When video has invalid format', () => {
            const invalidExtensions = ['.txt', '.pdf', '.jpg', '.png', '.gif', '.zip'];

            invalidExtensions.forEach(extension => {
                it(`Then should return false for ${extension} extension`, () => {
                    const video = Video.create(
                        `file${extension}`,
                        '/path',
                        1000,
                        'user-123',
                    );

                    expect(video.isValidFormat()).toBe(false);
                });
            });

            it('Then should return false for file without extension', () => {
                const video = Video.create('video', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(false);
            });

            it('Then should return false for file with empty extension', () => {
                const video = Video.create('video.', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(false);
            });

            it('Then should return false for file with multiple dots', () => {
                const video = Video.create('video.backup.txt', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(false);
            });
        });

        describe('When filename contains dots in name', () => {
            it('Then should validate based on last extension only', () => {
                const video = Video.create('my.video.file.mp4', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(true);
            });
        });
    });
});