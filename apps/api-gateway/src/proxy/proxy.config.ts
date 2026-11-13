import { Logger } from '@nestjs/common';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import type { Request, Response } from 'express';
import { SERVICE_PORTS } from '@app/common';

export interface DownstreamServiceConfig {
  prefix: string;
  target: string;
  name: string;
}

export function getDownstreamServices(): DownstreamServiceConfig[] {
  return [
    {
      prefix: '/api/v1/auth',
      target:
        process.env.AUTH_SERVICE_URL ??
        `http://localhost:${SERVICE_PORTS.AUTH_SERVICE}`,
      name: 'auth-service',
    },
    {
      prefix: '/api/v1/customers',
      target:
        process.env.CUSTOMER_SERVICE_URL ??
        `http://localhost:${SERVICE_PORTS.CUSTOMER_SERVICE}`,
      name: 'customer-service',
    },
    {
      prefix: '/api/v1/accounts',
      target:
        process.env.ACCOUNT_SERVICE_URL ??
        `http://localhost:${SERVICE_PORTS.ACCOUNT_SERVICE}`,
      name: 'account-service',
    },
    {
      prefix: '/api/v1/transfers',
      target:
        process.env.TRANSFER_SERVICE_URL ??
        `http://localhost:${SERVICE_PORTS.TRANSFER_SERVICE}`,
      name: 'transfer-service',
    },
    {
      prefix: '/api/v1/ledger',
      target:
        process.env.LEDGER_SERVICE_URL ??
        `http://localhost:${SERVICE_PORTS.LEDGER_SERVICE}`,
      name: 'ledger-service',
    },
  ];
}

export function createServiceProxy(service: DownstreamServiceConfig) {
  const logger = new Logger(`Proxy[${service.name}]`);
  const rawPrefix = service.prefix.replace('/api/v1', '');

  const options: Options<Request, Response> = {
    target: service.target,
    changeOrigin: true,
    pathFilter: (pathname: string) =>
      pathname === service.prefix ||
      pathname.startsWith(`${service.prefix}/`) ||
      pathname === rawPrefix ||
      pathname.startsWith(`${rawPrefix}/`),
    pathRewrite: {
      '^/api/v1': '',
    },
    on: {
      error: (err, _req, res) => {
        logger.error(`Error proxying to ${service.target}: ${err.message}`);
        if ('writeHead' in res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              statusCode: 502,
              message: `Bad Gateway: ${service.name} unavailable`,
              timestamp: new Date().toISOString(),
            }),
          );
        }
      },
    },
  };

  return createProxyMiddleware(options);
}
