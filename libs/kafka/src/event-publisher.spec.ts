import type {
  IEventEnvelope,
  IUserRegisteredEventData,
} from '@app/common/interfaces/events';
import { KAFKA_TOPICS } from './constants/kafka.constants';
import { EventPublisher } from './event-publisher';

describe('EventPublisher', () => {
  const data: IUserRegisteredEventData = {
    userId: 'user-1',
    phone: '+85512345678',
    registeredAt: '2026-01-01T00:00:00.000Z',
  };
  let client: { emit: jest.Mock };
  let publisher: EventPublisher;

  beforeEach(() => {
    client = { emit: jest.fn() };
    publisher = new EventPublisher(client as never, 'auth-service');
  });

  it('wraps the data in an envelope stamped with this service as source', () => {
    publisher.publish(KAFKA_TOPICS.USER_REGISTERED, data);

    const [topic, event] = client.emit.mock.calls[0] as [
      string,
      IEventEnvelope<IUserRegisteredEventData>,
    ];
    expect(topic).toBe(KAFKA_TOPICS.USER_REGISTERED);
    expect(event).toMatchObject({
      eventType: KAFKA_TOPICS.USER_REGISTERED,
      version: 1,
      source: 'auth-service',
      data,
    });
    expect(typeof event.eventId).toBe('string');
  });

  it('sends a keyed message when a key is given', () => {
    publisher.publish(KAFKA_TOPICS.USER_REGISTERED, data, 'user-1');

    const [, message] = client.emit.mock.calls[0] as [
      string,
      { key: string; value: IEventEnvelope<IUserRegisteredEventData> },
    ];
    expect(message.key).toBe('user-1');
    expect(message.value.data).toEqual(data);
  });
});
