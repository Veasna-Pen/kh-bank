import { SERVICE_PORTS, SERVICES } from '@app/common';
import { bootstrapService } from '@app/common/bootstrap';
import { connectKafkaMicroservice } from '@app/kafka';
import { LedgerServiceModule } from './ledger-service.module';

void bootstrapService(LedgerServiceModule, {
  name: SERVICES.LEDGER_SERVICE,
  port: SERVICE_PORTS.LEDGER_SERVICE,
  connectMicroservices: (app) =>
    connectKafkaMicroservice(app, 'ledger-service-consumer'),
});
