import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { service: string; message: string } {
    return {
      service: 'api-gateway',
      message: 'KH-BANK API Gateway',
    };
  }

  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
