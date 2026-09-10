import { Logger } from '@nestjs/common';
import { AuthDatabaseService } from './auth';

describe('PgDatabaseService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs an idle client error instead of crashing the process', async () => {
    const logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const database = new AuthDatabaseService();

    expect(() =>
      database['pool'].emit('error', new Error('connection terminated')),
    ).not.toThrow();
    expect(logError).toHaveBeenCalledWith(
      'Idle database client error: connection terminated',
    );

    await database.onModuleDestroy();
  });
});
