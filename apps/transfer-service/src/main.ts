import { SERVICE_PORTS, SERVICES } from '@app/common';
import { bootstrapService } from '@app/common/bootstrap';
import { connectKafkaMicroservice } from '@app/kafka';
import { TransferServiceModule } from './transfer-service.module';

void bootstrapService(TransferServiceModule, {
  name: SERVICES.TRANSFER_SERVICE,
  port: SERVICE_PORTS.TRANSFER_SERVICE,
  connectMicroservices: (app) =>
    connectKafkaMicroservice(app, 'transfer-service-consumer'),
});
