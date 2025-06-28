import {Controller, Get, Header, HttpStatus, Param, Post, Res, UploadedFile, UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {ApiConsumes, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags} from '@nestjs/swagger';
import {Response} from 'express';
import {diskStorage} from 'multer';
import {FileValidationService} from '../../application/services/file-validation.service';
import {ProcessingResult} from '../../domain/entities/processing-result.entity';
import * as path from 'path';
import * as fs from 'fs/promises';
import {ProcessVideoUseCase} from "../../application/usecases/process-video.usecase";
import {ListProcessedFilesUseCase} from "../../application/usecases/list-processed.usecase";

@ApiTags('Video Processing')
@Controller()
export class VideoController {
    constructor(
        private readonly processVideoUseCase: ProcessVideoUseCase,
        private readonly listProcessedFilesUseCase: ListProcessedFilesUseCase,
        private readonly fileValidationService: FileValidationService,
    ) {
    }

    @Get()
    @ApiOperation({summary: 'Página inicial com formulário de upload'})
    @ApiProduces('text/html')
    @Header('Content-Type', 'text/html')
    getHome(): string {
        return this.getHTMLForm();
    }

    @Post('upload')
    @ApiOperation({summary: 'Upload e processamento de vídeo'})
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
        status: 200,
        description: 'Vídeo processado com sucesso',
        type: ProcessingResult
    })
    @ApiResponse({
        status: 400,
        description: 'Erro de validação do arquivo'
    })
    @UseInterceptors(FileInterceptor('video', {
        storage: diskStorage({
            destination: 'uploads',
            filename: (req, file, cb) => {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                cb(null, `${timestamp}_${file.originalname}`);
            },
        }),
    }))
    async uploadVideo(@UploadedFile() file: Express.Multer.File): Promise<ProcessingResult> {
        if (!file) {
            return new ProcessingResult(false, 'Erro ao receber arquivo');
        }

        if (!this.fileValidationService.isValidVideoFile(file.originalname)) {
            await fs.unlink(file.path);
            return new ProcessingResult(false, 'Formato de arquivo não suportado. Use: mp4, avi, mov, mkv');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        try {
            const result = await this.processVideoUseCase.execute(file.path, timestamp);

            if (result.success) {
                await fs.unlink(file.path);
            }

            return result;
        } catch (error) {
            return new ProcessingResult(false, error.message);
        }
    }

    @Get('download/:filename')
    @ApiOperation({summary: 'Download do arquivo ZIP processado'})
    @ApiParam({
        name: 'filename',
        description: 'Nome do arquivo ZIP',
        example: 'frames_20250628_143021.zip'
    })
    @ApiResponse({
        status: 200,
        description: 'Arquivo enviado com sucesso',
        content: {
            'application/zip': {
                schema: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Arquivo não encontrado'
    })
    async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = path.join('outputs', filename);

        try {
            await fs.access(filePath);
            res.setHeader('Content-Description', 'File Transfer');
            res.setHeader('Content-Transfer-Encoding', 'binary');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', 'application/zip');
            res.sendFile(path.resolve(filePath));
        } catch {
            res.status(HttpStatus.NOT_FOUND).json({error: 'Arquivo não encontrado'});
        }
    }

    @Get('api/status')
    @ApiOperation({summary: 'Listar todos os arquivos processados'})
    @ApiResponse({
        status: 200,
        description: 'Lista de arquivos retornada com sucesso',
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            filename: {type: 'string', example: 'frames_20250628_143021.zip'},
                            size: {type: 'number', example: 1048576},
                            created_at: {type: 'string', example: '2025-06-28 14:30:21'},
                            download_url: {type: 'string', example: '/download/frames_20250628_143021.zip'}
                        }
                    }
                },
                total: {type: 'number', example: 5}
            }
        }
    })
    @ApiResponse({
        status: 500,
        description: 'Erro interno do servidor'
    })
    async getStatus() {
        try {
            const files = await this.listProcessedFilesUseCase.execute();
            return {
                files,
                total: files.length,
            };
        } catch (error) {
            return {error: 'Erro ao listar arquivos'};
        }
    }

    private getHTMLForm(): string {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FIAP X - Processador de Vídeos</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333; 
            text-align: center;
            margin-bottom: 30px;
        }
        .upload-form {
            border: 2px dashed #ddd;
            padding: 30px;
            text-align: center;
            border-radius: 10px;
            margin: 20px 0;
        }
        input[type="file"] {
            margin: 20px 0;
            padding: 10px;
        }
        button {
            background: #007bff;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover { background: #0056b3; }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            display: none;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .loading { 
            text-align: center; 
            display: none;
            margin: 20px 0;
        }
        .files-list {
            margin-top: 30px;
        }
        .file-item {
            background: #f8f9fa;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .download-btn {
            background: #28a745;
            color: white;
            padding: 5px 15px;
            text-decoration: none;
            border-radius: 3px;
            font-size: 14px;
        }
        .download-btn:hover { background: #218838; }
        .swagger-link {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #17a2b8;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        .swagger-link:hover { background: #138496; }
    </style>
</head>
<body>
    <a href="/api-docs" class="swagger-link">📚 API Docs</a>
    
    <div class="container">
        <h1>🎬 FIAP X - Processador de Vídeos</h1>
        <p style="text-align: center; color: #666;">
            Faça upload de um vídeo e receba um ZIP com todos os frames extraídos!
        </p>
        
        <form id="uploadForm" class="upload-form">
            <p><strong>Selecione um arquivo de vídeo:</strong></p>
            <input type="file" id="videoFile" accept="video/*" required>
            <br>
            <button type="submit">🚀 Processar Vídeo</button>
        </form>
        
        <div class="loading" id="loading">
            <p>⏳ Processando vídeo... Isso pode levar alguns minutos.</p>
        </div>
        
        <div class="result" id="result"></div>
        
        <div class="files-list">
            <h3>📁 Arquivos Processados:</h3>
            <div id="filesList">Carregando...</div>
        </div>
    </div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('videoFile');
            const file = fileInput.files[0];
            
            if (!file) {
                showResult('Selecione um arquivo de vídeo!', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('video', file);
            
            showLoading(true);
            hideResult();
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                console.log('Response:', result); // Debug log
                
                if (result && result.success) {
                    const zipPath = result.zipPath || 'arquivo.zip';
                    showResult(
                        result.message + 
                        '<br><br><a href="/download/' + zipPath + '" class="download-btn">⬇️ Download ZIP</a>',
                        'success'
                    );
                    loadFilesList();
                } else {
                    const errorMessage = result && result.message ? result.message : 'Erro desconhecido';
                    showResult('Erro: ' + errorMessage, 'error');
                }
            } catch (error) {
                console.error('Error:', error); // Debug log
                showResult('Erro de conexão: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        });
        
        function showResult(message, type) {
            const result = document.getElementById('result');
            result.innerHTML = message;
            result.className = 'result ' + type;
            result.style.display = 'block';
        }
        
        function hideResult() {
            document.getElementById('result').style.display = 'none';
        }
        
        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
        }
        
        async function loadFilesList() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                const filesList = document.getElementById('filesList');
                
                if (data.files && data.files.length > 0) {
                    filesList.innerHTML = data.files.map(file => 
                        '<div class="file-item">' +
                        '<span>' + file.filename + ' (' + formatFileSize(file.size) + ') - ' + file.created_at + '</span>' +
                        '<a href="' + file.download_url + '" class="download-btn">⬇️ Download</a>' +
                        '</div>'
                    ).join('');
                } else {
                    filesList.innerHTML = '<p>Nenhum arquivo processado ainda.</p>';
                }
            } catch (error) {
                document.getElementById('filesList').innerHTML = '<p>Erro ao carregar arquivos.</p>';
            }
        }
        
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        loadFilesList();
    </script>
</body>
</html>`;
    }
}