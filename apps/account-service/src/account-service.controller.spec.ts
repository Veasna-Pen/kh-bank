import { Test, TestingModule } from '@nestjs/testing';
import { AccountServiceController } from './account-service.controller';
import { AccountServiceService } from './account-service.service';

describe('AccountServiceController', () => {
  let accountServiceController: AccountServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AccountServiceController],
      providers: [AccountServiceService],
    }).compile();

    accountServiceController = app.get<AccountServiceController>(AccountServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(accountServiceController.getHello()).toBe('Hello World!');
    });
  });
});
