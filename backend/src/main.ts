import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Allow all origins in development, specific in production
  const frontendUrl = configService.get('FRONTEND_URL');
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [frontendUrl]
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = configService.get('PORT', 3001);
  await app.listen(port);
  
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode`);
  console.log(`🌐 API available at: http://localhost:${port}`);
  console.log(`✅ Health check at: http://localhost:${port}/health`);
}
bootstrap();