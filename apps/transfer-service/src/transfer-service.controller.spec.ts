import { Test, TestingModule } from '@nestjs/testing';
import { TransferServiceController } from './transfer-service.controller';
import { TransferServiceService } from './transfer-service.service';

describe('TransferServiceController', () => {
  let transferServiceController: TransferServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TransferServiceController],
      providers: [TransferServiceService],
    }).compile();

    transferServiceController = app.get<TransferServiceController>(TransferServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(transferServiceController.getHello()).toBe('Hello World!');
    });
  });
});
