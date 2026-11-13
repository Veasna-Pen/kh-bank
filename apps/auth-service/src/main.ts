import { SERVICE_PORTS, SERVICES } from '@app/common';
import { bootstrapService } from '@app/common/bootstrap';
import { AuthServiceModule } from './auth-service.module';

void bootstrapService(AuthServiceModule, {
  name: SERVICES.AUTH_SERVICE,
  port: SERVICE_PORTS.AUTH_SERVICE,
});
