import { AccountStatus } from '@app/common/enums';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsNotEmpty({ message: 'Account status is required' })
  @IsEnum(AccountStatus, {
    message: 'Account status must be ACTIVE, BLOCKED, or CLOSED',
  })
  status: AccountStatus;
}
