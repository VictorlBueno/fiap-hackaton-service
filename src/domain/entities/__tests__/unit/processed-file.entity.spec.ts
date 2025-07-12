import {ProcessedFile} from "../../processed-file.entity";

describe('Arquivo Processado', () => {
    describe('Dado uma instância de ProcessedFile', () => {
        const filename = 'document.pdf';
        const size = 1024;
        const createdAt = new Date('2025-01-15T10:30:00Z');
        const downloadUrl = 'https://storage.example.com/files/document.pdf';

        describe('Quando criado com parâmetros válidos', () => {
            const processedFile = new ProcessedFile(filename, size, createdAt, downloadUrl);

            it('Então deve ter o nome do arquivo correto', () => {
                expect(processedFile.filename).toBe(filename);
            });

            it('Então deve ter o tamanho correto', () => {
                expect(processedFile.size).toBe(size);
            });

            it('Então deve ter a data de criação correta', () => {
                expect(processedFile.createdAt).toBe(createdAt);
            });

            it('Então deve ter a URL de download correta', () => {
                expect(processedFile.downloadUrl).toBe(downloadUrl);
            });
        });

        describe('Quando criado com nome de arquivo vazio', () => {
            it('Então deve aceitar string vazia', () => {
                const file = new ProcessedFile('', size, createdAt, downloadUrl);
                expect(file.filename).toBe('');
            });
        });

        describe('Quando criado com tamanho zero', () => {
            it('Então deve aceitar tamanho zero', () => {
                const file = new ProcessedFile(filename, 0, createdAt, downloadUrl);
                expect(file.size).toBe(0);
            });
        });

        describe('Quando criado com tamanho negativo', () => {
            it('Então deve aceitar tamanho negativo', () => {
                const file = new ProcessedFile(filename, -100, createdAt, downloadUrl);
                expect(file.size).toBe(-100);
            });
        });
    });
});