import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import type { Request, Response } from 'express';
import { createServiceProxy, getDownstreamServices } from './proxy.config';

type ProxyOptions = Options<Request, Response>;

let lastCapturedOptions: ProxyOptions | undefined;

jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn((options: ProxyOptions) => {
    lastCapturedOptions = options;
    return () => undefined;
  }),
}));

describe('ProxyConfig', () => {
  describe('getDownstreamServices', () => {
    it('returns all 5 downstream microservices with default ports and /api/v1 prefixes', () => {
      const services = getDownstreamServices();
      expect(services).toHaveLength(5);

      const map = Object.fromEntries(services.map((s) => [s.prefix, s]));

      expect(map['/api/v1/auth']).toMatchObject({
        prefix: '/api/v1/auth',
        name: 'auth-service',
        target: 'http://localhost:3001',
      });
      expect(map['/api/v1/customers']).toMatchObject({
        prefix: '/api/v1/customers',
        name: 'customer-service',
        target: 'http://localhost:3003',
      });
      expect(map['/api/v1/accounts']).toMatchObject({
        prefix: '/api/v1/accounts',
        name: 'account-service',
        target: 'http://localhost:3002',
      });
      expect(map['/api/v1/transfers']).toMatchObject({
        prefix: '/api/v1/transfers',
        name: 'transfer-service',
        target: 'http://localhost:3005',
      });
      expect(map['/api/v1/ledger']).toMatchObject({
        prefix: '/api/v1/ledger',
        name: 'ledger-service',
        target: 'http://localhost:3004',
      });
    });

    it('respects environment variable overrides', () => {
      process.env.AUTH_SERVICE_URL = 'http://auth.internal:8080';
      const services = getDownstreamServices();
      const auth = services.find((s) => s.prefix === '/api/v1/auth');
      expect(auth?.target).toBe('http://auth.internal:8080');
      delete process.env.AUTH_SERVICE_URL;
    });
  });

  describe('createServiceProxy', () => {
    it('creates proxy middleware with correct options and rewrites /api/v1', () => {
      const config = {
        prefix: '/api/v1/auth',
        target: 'http://localhost:3001',
        name: 'auth-service',
      };

      createServiceProxy(config);
      expect(createProxyMiddleware).toHaveBeenCalled();

      const options = lastCapturedOptions;
      expect(options).toBeDefined();
      expect(options?.target).toBe('http://localhost:3001');
      expect(options?.changeOrigin).toBe(true);
      expect(options?.pathRewrite).toEqual({ '^/api/v1': '' });

      const filter = options?.pathFilter as (pathname: string) => boolean;
      expect(typeof filter).toBe('function');
      expect(filter('/api/v1/auth')).toBe(true);
      expect(filter('/api/v1/auth/login')).toBe(true);
      expect(filter('/auth/login')).toBe(true);
      expect(filter('/api/v1/customers')).toBe(false);
      expect(filter('/api/v1/health')).toBe(false);
    });

    it('handles proxy error with 502 JSON response', () => {
      const config = {
        prefix: '/api/v1/auth',
        target: 'http://localhost:3001',
        name: 'auth-service',
      };

      createServiceProxy(config);
      const options = lastCapturedOptions;
      expect(options?.on?.error).toBeDefined();

      const writeHead = jest.fn();
      let endedPayload = '';
      const end = jest.fn((chunk: string) => {
        endedPayload = chunk;
      });

      const mockRes = {
        headersSent: false,
        writeHead,
        end,
      } as unknown as Response;

      const errorHandler = options?.on?.error;
      errorHandler?.(new Error('ECONNREFUSED'), {} as Request, mockRes);

      expect(writeHead).toHaveBeenCalledWith(502, {
        'Content-Type': 'application/json',
      });
      expect(end).toHaveBeenCalled();

      const payload = JSON.parse(endedPayload) as {
        statusCode: number;
        message: string;
      };
      expect(payload).toMatchObject({
        statusCode: 502,
        message: 'Bad Gateway: auth-service unavailable',
      });
    });
  });
});
