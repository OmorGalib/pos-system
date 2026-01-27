import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  welcome() {
    return {
      message: 'Welcome to POS System API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/health',
    };
  }
}