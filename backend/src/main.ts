import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  const port = process.env.PORT || 3001;
  try {
    await app.listen(port);
    Logger.log(`🚀 Application running on port ${port}`, 'Bootstrap');
    Logger.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`, 'Bootstrap');
    Logger.log(`🔗 Health check: http://localhost:${port}/health`, 'Bootstrap');
  } catch (error) {
    Logger.error('Failed to start application:', error);
  }
}
bootstrap();