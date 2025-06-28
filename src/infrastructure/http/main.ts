import {NestFactory} from '@nestjs/core';
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

    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept',
    });

    await app.listen(8080);

    console.log('🎬 Servidor iniciado na porta 8080');
    console.log('📂 Acesse: http://localhost:8080');
}

bootstrap();