import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { JwtAuthGuard } from '@app/auth';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';

describe('AuthServiceController', () => {
  const service = { login: jest.fn() };
  let controller: AuthServiceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthServiceController],
      providers: [{ provide: AuthServiceService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = app.get(AuthServiceController);
  });

  it('passes the client IP and user agent to login', async () => {
    const dto = {
      phone: '+85512345678',
      password: 'secret1',
      deviceId: 'device-1',
    };
    const req = {
      ip: '10.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as unknown as Request;

    await controller.login(dto, req);

    expect(service.login).toHaveBeenCalledWith(dto, {
      ipAddress: '10.0.0.1',
      userAgent: 'jest',
    });
  });
});
