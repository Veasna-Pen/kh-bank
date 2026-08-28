import { Injectable } from '@nestjs/common';

@Injectable()
export class TransferServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
