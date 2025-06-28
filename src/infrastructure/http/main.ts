import {NestFactory} from '@nestjs/core';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import * as fs from 'fs';
import {AppModule} from "../modules/app.module";
import {initDatabase} from "../config/database.config";

async function bootstrap() {
    // Criar diretórios necessários
    const dirs = ['uploads', 'outputs', 'temp'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }
    });

    // Inicializar banco de dados
    await initDatabase();

    const app = await NestFactory.create(AppModule);

    // Configuração do Swagger
    const config = new DocumentBuilder()
        .setTitle('Video Processor API')
        .setDescription('API para processamento de vídeos e extração de frames')
        .setVersion('1.0')
        .addTag('Video Processing', 'Endpoints para upload e processamento de vídeos')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
        customSiteTitle: 'Video Processor API',
        customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        customJs: [
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
        ],
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'list',
            filter: true,
            showRequestHeaders: true,
            tryItOutEnabled: true,
        },
    });

    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept',
    });

    await app.listen(8080);

    console.log('🎬 Servidor iniciado na porta 8080');
    console.log('📂 Acesse: http://localhost:8080');
    console.log('📚 Swagger UI: http://localhost:8080/api-docs');
}

bootstrap();