import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  async check(): Promise<any> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
