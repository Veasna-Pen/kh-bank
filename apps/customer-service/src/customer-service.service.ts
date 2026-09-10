import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomerDatabaseService } from '@app/database/customer';
import { customers, customerAddresses, Customer } from '@app/database/customer';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerDto,
  UpdateKycStatusDto,
} from '@app/common/dto/customer';
import { CustomerStatus, KycStatus } from '@app/common/enums';
import {
  ICustomerSnapshotEventData,
  IUserRegisteredEventData,
} from '@app/common/interfaces/events';
import {
  buildEvent,
  EVENT_SOURCES,
  KAFKA_SERVICE,
  KAFKA_TOPICS,
} from '@app/kafka';
import type { ClientKafka } from '@nestjs/microservices';
import { and, desc, eq, ne } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    private readonly customerDB: CustomerDatabaseService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
  ) {}

  private publishSnapshot(topic: string, customer: Customer) {
    this.kafkaClient.emit(topic, {
      key: customer.id,
      value: buildEvent<ICustomerSnapshotEventData>(
        topic,
        EVENT_SOURCES.CUSTOMER_SERVICE,
        {
          customerId: customer.id,
          userId: customer.userId,
          status: customer.status as CustomerStatus,
          kycStatus: customer.kycStatus as KycStatus,
          updatedAt: customer.updatedAt.toISOString(),
        },
      ),
    });
  }

  private async findCustomerByUserId(userId: string): Promise<Customer> {
    const [customer] = await this.customerDB.db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return customer;
  }

  async getMe(userId: string) {
    const customer = await this.findCustomerByUserId(userId);

    const addresses = await this.customerDB.db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customer.id))
      .orderBy(
        desc(customerAddresses.isPrimary),
        desc(customerAddresses.createdAt),
      );

    return {
      customer,
      addresses,
    };
  }

  async updateMe(userId: string, dto: UpdateCustomerDto) {
    const customer = await this.findCustomerByUserId(userId);

    if (customer.status !== 'ACTIVE') {
      throw new ForbiddenException('Customer account is not active');
    }

    const updateData: Partial<typeof customers.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) updateData.gender = dto.gender;

    const [updated] = await this.customerDB.db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, customer.id))
      .returning();

    return {
      message: 'Profile updated successfully',
      customer: updated,
    };
  }

  async getAddresses(userId: string) {
    const customer = await this.findCustomerByUserId(userId);

    const addresses = await this.customerDB.db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customer.id))
      .orderBy(
        desc(customerAddresses.isPrimary),
        desc(customerAddresses.createdAt),
      );

    return {
      addresses,
      total: addresses.length,
    };
  }

  async addAddress(userId: string, dto: CreateCustomerAddressDto) {
    const customer = await this.findCustomerByUserId(userId);

    const existingAddresses = await this.customerDB.db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customer.id));

    const isPrimary =
      existingAddresses.length === 0 ? true : Boolean(dto.isPrimary);

    if (isPrimary && existingAddresses.length > 0) {
      await this.customerDB.db
        .update(customerAddresses)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(customerAddresses.customerId, customer.id));
    }

    const [newAddress] = await this.customerDB.db
      .insert(customerAddresses)
      .values({
        id: crypto.randomUUID(),
        customerId: customer.id,
        addressLine: dto.addressLine,
        city: dto.city,
        province: dto.province,
        country: dto.country,
        postalCode: dto.postalCode,
        isPrimary,
      })
      .returning();

    return {
      message: 'Address added successfully',
      address: newAddress,
    };
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const customer = await this.findCustomerByUserId(userId);

    const [address] = await this.customerDB.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, customer.id),
        ),
      )
      .limit(1);

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isPrimary) {
      await this.customerDB.db
        .update(customerAddresses)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(customerAddresses.customerId, customer.id),
            ne(customerAddresses.id, addressId),
          ),
        );
    }

    const updateData: Partial<typeof customerAddresses.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.addressLine !== undefined) updateData.addressLine = dto.addressLine;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.province !== undefined) updateData.province = dto.province;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.isPrimary !== undefined) updateData.isPrimary = dto.isPrimary;

    const [updated] = await this.customerDB.db
      .update(customerAddresses)
      .set(updateData)
      .where(eq(customerAddresses.id, addressId))
      .returning();

    return {
      message: 'Address updated successfully',
      address: updated,
    };
  }

  async deleteAddress(userId: string, addressId: string) {
    const customer = await this.findCustomerByUserId(userId);

    const [address] = await this.customerDB.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, customer.id),
        ),
      )
      .limit(1);

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.customerDB.db
      .delete(customerAddresses)
      .where(eq(customerAddresses.id, addressId));

    if (address.isPrimary) {
      const [nextAddress] = await this.customerDB.db
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, customer.id))
        .orderBy(desc(customerAddresses.createdAt))
        .limit(1);

      if (nextAddress) {
        await this.customerDB.db
          .update(customerAddresses)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(customerAddresses.id, nextAddress.id));
      }
    }

    return {
      message: 'Address deleted successfully',
    };
  }

  async getCustomerById(customerId: string) {
    const [customer] = await this.customerDB.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const addresses = await this.customerDB.db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customer.id))
      .orderBy(
        desc(customerAddresses.isPrimary),
        desc(customerAddresses.createdAt),
      );

    return {
      customer,
      addresses,
    };
  }

  async updateKycStatus(customerId: string, dto: UpdateKycStatusDto) {
    const [customer] = await this.customerDB.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const [updated] = await this.customerDB.db
      .update(customers)
      .set({
        kycStatus: dto.kycStatus,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning();

    this.publishSnapshot(KAFKA_TOPICS.CUSTOMER_KYC_UPDATED, updated);

    this.logger.log(
      `KYC status for customer ${customerId} updated to ${dto.kycStatus}`,
    );

    return {
      message: 'KYC status updated successfully',
      customer: updated,
    };
  }

  async handleUserRegistered(data: IUserRegisteredEventData) {
    const [existing] = await this.customerDB.db
      .select()
      .from(customers)
      .where(eq(customers.userId, data.userId))
      .limit(1);

    if (existing) {
      this.logger.log(
        `Customer profile already exists for userId: ${data.userId}`,
      );
      return existing;
    }

    const [newCustomer] = await this.customerDB.db
      .insert(customers)
      .values({
        id: crypto.randomUUID(),
        userId: data.userId,
        phone: data.phone,
        firstName: '',
        lastName: '',
        status: 'ACTIVE',
        kycStatus: 'PENDING',
      })
      .returning();

    this.publishSnapshot(KAFKA_TOPICS.CUSTOMER_CREATED, newCustomer);

    this.logger.log(`Created customer profile for userId: ${data.userId}`);

    return newCustomer;
  }
}
