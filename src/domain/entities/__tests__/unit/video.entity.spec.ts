import {Video} from "../../video.entity";

describe('Vídeo', () => {
    const baseVideoData = {
        id: 'test-uuid-123',
        originalName: 'video.mp4',
        path: '/uploads/video.mp4',
        size: 1024000,
        userId: 'user-123',
    };

    describe('Dado um construtor de Video', () => {
        describe('Quando criado com todos os parâmetros', () => {
            const createdAt = new Date('2025-01-15T10:30:00Z');
            const video = new Video(
                baseVideoData.id,
                baseVideoData.originalName,
                baseVideoData.path,
                baseVideoData.size,
                baseVideoData.userId,
                createdAt,
            );

            it('Então deve definir todas as propriedades corretamente', () => {
                expect(video.id).toBe(baseVideoData.id);
                expect(video.originalName).toBe(baseVideoData.originalName);
                expect(video.path).toBe(baseVideoData.path);
                expect(video.size).toBe(baseVideoData.size);
                expect(video.userId).toBe(baseVideoData.userId);
                expect(video.createdAt).toBe(createdAt);
            });
        });

        describe('Quando criado sem o parâmetro createdAt', () => {
            it('Então deve usar a data atual como padrão', () => {
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

    describe('Dado o método factory de Video', () => {
        describe('Quando criando um novo vídeo', () => {
            const video = Video.create(
                baseVideoData.originalName,
                baseVideoData.path,
                baseVideoData.size,
                baseVideoData.userId,
            );

            it('Então deve gerar UUID e definir propriedades', () => {
                expect(video.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
                expect(video.originalName).toBe(baseVideoData.originalName);
                expect(video.path).toBe(baseVideoData.path);
                expect(video.size).toBe(baseVideoData.size);
                expect(video.userId).toBe(baseVideoData.userId);
                expect(video.createdAt).toBeInstanceOf(Date);
            });

            it('Então deve gerar IDs únicos para instâncias diferentes', () => {
                const video1 = Video.create('test1.mp4', '/path1', 1000, 'user1');
                const video2 = Video.create('test2.mp4', '/path2', 2000, 'user2');

                expect(video1.id).not.toBe(video2.id);
            });
        });
    });

    describe('Dada a validação de formato de Video', () => {
        const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];

        describe('Quando o vídeo tem formato válido', () => {
            validExtensions.forEach(extension => {
                it(`Então deve retornar true para extensão ${extension}`, () => {
                    const video = Video.create(
                        `video${extension}`,
                        '/path',
                        1000,
                        'user-123',
                    );

                    expect(video.isValidFormat()).toBe(true);
                });

                it(`Então deve retornar true para extensão maiúscula ${extension.toUpperCase()}`, () => {
                    const video = Video.create(
                        `VIDEO${extension.toUpperCase()}`,
                        '/path',
                        1000,
                        'user-123',
                    );

                    expect(video.isValidFormat()).toBe(true);
                });
            });

            it('Então deve retornar true para extensões com maiúsculas e minúsculas misturadas', () => {
                const video = Video.create('Video.Mp4', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(true);
            });
        });

        describe('Quando o vídeo tem formato inválido', () => {
            const invalidExtensions = ['.txt', '.pdf', '.jpg', '.png', '.gif', '.zip'];

            invalidExtensions.forEach(extension => {
                it(`Então deve retornar false para extensão ${extension}`, () => {
                    const video = Video.create(
                        `file${extension}`,
                        '/path',
                        1000,
                        'user-123',
                    );

                    expect(video.isValidFormat()).toBe(false);
                });
            });

            it('Então deve retornar false para arquivo sem extensão', () => {
                const video = Video.create('video', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(false);
            });

            it('Então deve retornar false para arquivo com extensão vazia', () => {
                const video = Video.create('video.', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(false);
            });

            it('Então deve retornar false para arquivo com múltiplos pontos', () => {
                const video = Video.create('video.backup.txt', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(false);
            });
        });

        describe('Quando o nome do arquivo contém pontos no nome', () => {
            it('Então deve validar baseado apenas na última extensão', () => {
                const video = Video.create('my.video.file.mp4', '/path', 1000, 'user-123');
                expect(video.isValidFormat()).toBe(true);
            });
        });
    });
});