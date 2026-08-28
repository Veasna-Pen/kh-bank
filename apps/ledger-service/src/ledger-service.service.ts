import { Injectable } from '@nestjs/common';

@Injectable()
export class LedgerServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
