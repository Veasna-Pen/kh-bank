export const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9093';
export const KAFKA_CLIENT_ID = 'kh-bank';
export const KAFKA_CONSUMER_GROUP = 'kh-bank-consumer';

export const KAFKA_TOPICS = {
  USER_REGISTERED: 'user.registered',

  ACCOUNT_CREATED: 'account.created',

  TRANSFER_CREATED: 'transfer.created',
  TRANSFER_PROCESSING: 'transfer.processing',
  TRANSFER_COMPLETED: 'transfer.completed',
  TRANSFER_FAILED: 'transfer.failed',
};

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export const EVENT_SOURCES = {
  AUTH_SERVICE: 'auth-service',
  CUSTOMER_SERVICE: 'customer-service',
  ACCOUNT_SERVICE: 'account-service',
  TRANSFER_SERVICE: 'transfer-service',
  LEDGER_SERVICE: 'ledger-service',
};
