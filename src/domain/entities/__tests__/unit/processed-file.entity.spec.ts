import {ProcessedFile} from "../../processed-file.entity";

describe('ProcessedFile', () => {
    describe('Given a ProcessedFile instance', () => {
        const filename = 'document.pdf';
        const size = 1024;
        const createdAt = new Date('2025-01-15T10:30:00Z');
        const downloadUrl = 'https://storage.example.com/files/document.pdf';

        describe('When created with valid parameters', () => {
            const processedFile = new ProcessedFile(filename, size, createdAt, downloadUrl);

            it('Then should have correct filename', () => {
                expect(processedFile.filename).toBe(filename);
            });

            it('Then should have correct size', () => {
                expect(processedFile.size).toBe(size);
            });

            it('Then should have correct creation date', () => {
                expect(processedFile.createdAt).toBe(createdAt);
            });

            it('Then should have correct download URL', () => {
                expect(processedFile.downloadUrl).toBe(downloadUrl);
            });
        });

        describe('When created with empty filename', () => {
            it('Then should accept empty string', () => {
                const file = new ProcessedFile('', size, createdAt, downloadUrl);
                expect(file.filename).toBe('');
            });
        });

        describe('When created with zero size', () => {
            it('Then should accept zero size', () => {
                const file = new ProcessedFile(filename, 0, createdAt, downloadUrl);
                expect(file.size).toBe(0);
            });
        });

        describe('When created with negative size', () => {
            it('Then should accept negative size', () => {
                const file = new ProcessedFile(filename, -100, createdAt, downloadUrl);
                expect(file.size).toBe(-100);
            });
        });
    });
});