import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuthDatabaseService } from '@app/database';
import { RegisterDto } from '@app/common/dto/auth';
import * as argon2 from 'argon2';
import { KAFKA_SERVICE, KAFKA_TOPICS, EVENT_SOURCES } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { users } from '@app/database/auth';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly authDB: AuthDatabaseService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
  ) { }

  async register(dto: RegisterDto) {
    const { phone, password } = dto;

    const [existingUser] = await this.authDB.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);


    if (existingUser) {
      throw new ConflictException('Phone number is already registered');
    }

    const passwordHash = await argon2.hash(password);
    const userId = uuidv4();

    await this.authDB.db.insert(users).values({
      id: userId,
      phone,
      passwordHash,
      status: 'ACTIVE',
    });

    this.kafkaClient.emit(KAFKA_TOPICS.USER_REGISTERED, {
      eventId: uuidv4(),
      version: 1,
      occurredAt: new Date().toISOString(),
      source: EVENT_SOURCES.AUTH_SERVICE,
      data: {
        userId,
        phone,
      },
    });

    return {
      message: 'User registered successfully',
      user: {
        id: userId,
        phone,
        status: 'ACTIVE',
      },
    };
  }
}
