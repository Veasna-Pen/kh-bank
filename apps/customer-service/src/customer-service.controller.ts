import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CustomerServiceService } from './customer-service.service';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerDto,
  UpdateKycStatusDto,
} from '@app/common/dto/customer';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/auth';
import { CurrentUser } from '@app/common';
import { UserRole } from '@app/common/enums';
import type { IAuthenticatedUser } from '@app/common/interfaces/auth';

@Controller('customers')
export class CustomerServiceController {
  constructor(
    private readonly customerServiceService: CustomerServiceService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: IAuthenticatedUser) {
    return this.customerServiceService.getMe(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerServiceService.updateMe(user.userId, dto);
  }

  @Get('me/address')
  @UseGuards(JwtAuthGuard)
  async getAddresses(@CurrentUser() user: IAuthenticatedUser) {
    return this.customerServiceService.getAddresses(user.userId);
  }

  @Post('me/address')
  @UseGuards(JwtAuthGuard)
  async addAddress(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customerServiceService.addAddress(user.userId, dto);
  }

  @Patch('me/address/:id')
  @UseGuards(JwtAuthGuard)
  async updateAddress(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('id') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customerServiceService.updateAddress(
      user.userId,
      addressId,
      dto,
    );
  }

  @Delete('me/address/:id')
  @UseGuards(JwtAuthGuard)
  async deleteAddress(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('id') addressId: string,
  ) {
    return this.customerServiceService.deleteAddress(user.userId, addressId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getCustomerById(@Param('id') customerId: string) {
    return this.customerServiceService.getCustomerById(customerId);
  }

  @Patch(':id/kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateKycStatus(
    @Param('id') customerId: string,
    @Body() dto: UpdateKycStatusDto,
  ) {
    return this.customerServiceService.updateKycStatus(customerId, dto);
  }
}
