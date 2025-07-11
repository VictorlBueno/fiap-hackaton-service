import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { AppModule } from '../modules/app.module';
import { MetricsInterceptor } from '../adapters/interceptors/metrics.interceptor';
import { MetricsService } from '../adapters/services/metrics.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const dirs = ['uploads', 'outputs', 'temp'];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log('🚀 Iniciando aplicação com Arquitetura Hexagonal...');
  const app = await NestFactory.create(AppModule);

  // Configurar interceptor global de métricas
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  const config = new DocumentBuilder()
    .setTitle('Video Processor API - Hexagonal Architecture')
    .setDescription(
      'API para processamento de vídeos com Arquitetura Hexagonal + RabbitMQ',
    )
    .setVersion('1.0')
    .addTag('Video Processing', 'Endpoints para processamento de vídeos')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Video Processor API',
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
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
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  await app.listen(8080);
}

bootstrap();
