import { SERVICE_PORTS, SERVICES } from '@app/common';
import { bootstrapService } from '@app/common/bootstrap';
import { connectKafkaMicroservice } from '@app/kafka';
import { AccountServiceModule } from './account-service.module';

void bootstrapService(AccountServiceModule, {
  name: SERVICES.ACCOUNT_SERVICE,
  port: SERVICE_PORTS.ACCOUNT_SERVICE,
  connectMicroservices: (app) =>
    connectKafkaMicroservice(app, 'account-service-consumer'),
});
