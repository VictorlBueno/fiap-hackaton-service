import {Controller, Get, Header, HttpStatus, Param, Post, Res, UploadedFile, UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {ApiConsumes, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags} from '@nestjs/swagger';
import {Response} from 'express';
import {diskStorage} from 'multer';
import {FileValidationService} from '../../application/services/file-validation.service';
import {QueueResponse} from '../../domain/entities/queue-response.entity';
import {ProcessingJob} from '../../domain/entities/processing-status.entity';
import * as path from 'path';
import * as fs from 'fs/promises';
import {QueueVideoUseCase} from "../../application/usecases/queue-video.usecase";
import {GetJobStatusUseCase} from "../../application/usecases/get-job-status.usecase";
import {ListProcessedFilesUseCase} from "../../application/usecases/list-processed.usecase";

@ApiTags('Video Processing')
@Controller()
export class VideoController {
    constructor(
        private readonly queueVideoUseCase: QueueVideoUseCase,
        private readonly getJobStatusUseCase: GetJobStatusUseCase,
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
    @ApiOperation({summary: 'Upload de vídeo e adição à fila de processamento'})
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
        status: 200,
        description: 'Vídeo adicionado à fila com sucesso',
        type: QueueResponse
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
    async uploadVideo(@UploadedFile() file: Express.Multer.File): Promise<QueueResponse> {
        try {
            if (!file) {
                return new QueueResponse(false, 'Erro ao receber arquivo', '', '');
            }

            if (!this.fileValidationService.isValidVideoFile(file.originalname)) {
                await fs.unlink(file.path);
                return new QueueResponse(false, 'Formato de arquivo não suportado. Use: mp4, avi, mov, mkv', '', '');
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            console.log(`📤 Adicionando vídeo à fila: ${file.originalname}`);
            const result = await this.queueVideoUseCase.execute(file.path, file.originalname, timestamp);

            return result;
        } catch (error) {
            console.error('Erro no upload:', error);
            return new QueueResponse(false, `Erro interno: ${error.message || 'Erro desconhecido'}`, '', '');
        }
    }

    @Get('api/job/:jobId')
    @ApiOperation({summary: 'Verificar status do job de processamento'})
    @ApiParam({
        name: 'jobId',
        description: 'ID do job de processamento',
        example: '2025-06-28T16-43-36-099Z'
    })
    @ApiResponse({
        status: 200,
        description: 'Status do job retornado com sucesso',
        type: ProcessingJob
    })
    @ApiResponse({
        status: 404,
        description: 'Job não encontrado'
    })
    async getJobStatus(@Param('jobId') jobId: string) {
        const job = await this.getJobStatusUseCase.execute(jobId);

        if (!job) {
            return {error: 'Job não encontrado'};
        }

        return job;
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
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
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
        .status-btn {
            background: #ffc107;
            color: #212529;
            padding: 5px 15px;
            text-decoration: none;
            border-radius: 3px;
            font-size: 14px;
            margin-left: 10px;
        }
        .status-btn:hover { background: #e0a800; }
    </style>
</head>
<body>
    <a href="/api-docs" class="swagger-link">📚 API Docs</a>
    
    <div class="container">
        <h1>🎬 FIAP X - Processador de Vídeos</h1>
        <p style="text-align: center; color: #666;">
            Faça upload de um vídeo e receba um ZIP com todos os frames extraídos!<br>
            <strong>Agora com processamento em fila!</strong>
        </p>
        
        <form id="uploadForm" class="upload-form">
            <p><strong>Selecione um arquivo de vídeo:</strong></p>
            <input type="file" id="videoFile" accept="video/*" required>
            <br>
            <button type="submit">🚀 Adicionar à Fila</button>
        </form>
        
        <div class="loading" id="loading">
            <p>⏳ Enviando vídeo para fila de processamento...</p>
        </div>
        
        <div class="result" id="result"></div>
        
        <div class="files-list">
            <h3>📁 Arquivos Processados:</h3>
            <div id="filesList">Carregando...</div>
        </div>
    </div>

    <script>
        let currentJobId = null;
        let statusInterval = null;

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
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const result = await response.json();
                console.log('Response:', result);
                
                if (result && result.success) {
                    currentJobId = result.jobId;
                    showResult(
                        result.message + 
                        '<br><br><div id="jobStatus">Verificando status...</div>',
                        'info'
                    );
                    
                    // Inicia monitoramento do status
                    startStatusMonitoring(result.jobId);
                    
                    // Reset form
                    fileInput.value = '';
                } else {
                    const errorMessage = result && result.message ? result.message : 'Erro desconhecido';
                    showResult('Erro: ' + errorMessage, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showResult('Erro de conexão: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        });

        async function startStatusMonitoring(jobId) {
            if (statusInterval) {
                clearInterval(statusInterval);
            }

            statusInterval = setInterval(async () => {
                try {
                    const response = await fetch(\`/api/job/\${jobId}\`);
                    const status = await response.json();
                    
                    const statusDiv = document.getElementById('jobStatus');
                    if (statusDiv && status) {
                        if (status.status === 'completed') {
                            const zipFilename = \`frames_\${jobId}.zip\`;
                            statusDiv.innerHTML = 
                                \`✅ \${status.message}<br><br>\` +
                                \`<a href="/download/\${zipFilename}" class="download-btn">⬇️ Download ZIP</a>\`;
                            clearInterval(statusInterval);
                            loadFilesList();
                        } else if (status.status === 'failed') {
                            statusDiv.innerHTML = \`❌ \${status.message}\`;
                            clearInterval(statusInterval);
                        } else {
                            statusDiv.innerHTML = \`⏳ \${status.message}\`;
                        }
                    }
                } catch (error) {
                    console.error('Error checking status:', error);
                }
            }, 3000); // Verifica a cada 3 segundos
        }
        
        function showResult(message, type) {
            const result = document.getElementById('result');
            result.innerHTML = message;
            result.className = 'result ' + type;
            result.style.display = 'block';
        }
        
        function hideResult() {
            document.getElementById('result').style.display = 'none';
            if (statusInterval) {
                clearInterval(statusInterval);
            }
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