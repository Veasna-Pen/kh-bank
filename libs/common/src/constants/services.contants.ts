export const SERVICES = {
  API_GATEWAY: 'api-gateway',
  AUTH_SERVICE: 'auth-service',
  ACCOUNT_SERVICE: 'account-service',
  CUSTOMER_SERVICE: 'customer-service',
  LEDGER_SERVICE: 'ledger-service',
  TRANSFER_SERVICE: 'transfer-service',
} as const;

export const SERVICE_PORTS = {
  API_GATEWAY: 3000,
  AUTH_SERVICE: 3001,
  ACCOUNT_SERVICE: 3002,
  CUSTOMER_SERVICE: 3003,
  LEDGER_SERVICE: 3004,
  TRANSFER_SERVICE: 3005,
} as const;
