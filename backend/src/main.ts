import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Project Lenta - Headless CMS & Chronological Hub API')
    .setDescription(
      'REST API single source of truth for Project Lenta, supporting Admin CMS, Calendar App, and Obsidian Local Sync.',
    )
    .setVersion('1.0.0')
    .addTag('Feeds', 'Data feeds management')
    .addTag('Notes', 'Chronological notes, events, periods, and releases')
    .addTag('Taxonomy', 'Hierarchical ltree taxonomy classification')
    .addTag('Sync', 'Delta sync pulls for offline-first clients')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Project Lenta API Documentation',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Project Lenta Backend running on: http://localhost:${port}`);
  console.log(`📑 Swagger Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
