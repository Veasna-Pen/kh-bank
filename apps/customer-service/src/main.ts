import { SERVICE_PORTS, SERVICES } from '@app/common';
import { bootstrapService } from '@app/common/bootstrap';
import { connectKafkaMicroservice } from '@app/kafka';
import { CustomerServiceModule } from './customer-service.module';

void bootstrapService(CustomerServiceModule, {
  name: SERVICES.CUSTOMER_SERVICE,
  port: SERVICE_PORTS.CUSTOMER_SERVICE,
  connectMicroservices: (app) =>
    connectKafkaMicroservice(app, 'customer-service-consumer'),
});
