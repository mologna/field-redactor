import * as crypto from 'crypto';
import { CustomObject, CustomObjectMatchType, FieldRedactorConfig } from '../../src/types';
import { FieldRedactor } from '../../src/fieldRedactor';
import { eventProcessingLogsMock, kafkaAdapterLogMock } from '../mocks/realExampleMocks';
import {
  sha256HashedEmail,
  sha256HashedFirstName,
  sha256HashedFullName,
  sha256HashedLastName,
  sha256HashedMdn,
  mockFirstName,
  mockLastName,
  mockFullName,
  mockEmail,
  mockMdn,
  mockAuthKey,
  sha256MhashedMockAuthKey
} from '../mocks/cryptoMockValues';

const mockRedactor: (value: any) => Promise<string> = (value: any) =>
  Promise.resolve(crypto.createHash('sha256').update(value.toString()).digest('hex'));

describe('Real Examples', () => {
  let fieldRedactor: FieldRedactor;
  beforeAll(() => {
    const eventDataCustomObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      value: 'name'
    };

    const config: FieldRedactorConfig = {
      redactor: mockRedactor,
      secretKeys: [/email/i, /mdn/i, /phone/i, /.+name$/i, /auth/i],
      customObjects: [eventDataCustomObject]
    };

    fieldRedactor = new FieldRedactor(config);
  });

  it('Can correctly redact application logs from a real example - event processing', async () => {
    const result = await fieldRedactor.redact(eventProcessingLogsMock);

    // test secrets were found correctly
    expect(result.destinations.email).not.toEqual(eventProcessingLogsMock.destinations.email);
    expect(result.destinations.email).toEqual(sha256HashedEmail);
    expect(result.destinations.fullName).not.toEqual(eventProcessingLogsMock.destinations.fullName);
    expect(result.destinations.fullName).toEqual(sha256HashedFullName);
    expect(result.destinations.mdn).not.toEqual(eventProcessingLogsMock.destinations.mdn);
    expect(result.destinations.mdn).toEqual(sha256HashedMdn);

    // test custom objects were redacted correctly
    validateEventArrayData(result.eventData, eventProcessingLogsMock.eventData);
  });

  it('Can correctly redact application logs from a real example - kafka adapter', async () => {
    const result = await fieldRedactor.redact(kafkaAdapterLogMock);

    // test secrets were found correctly
    expect(result.event.appAuthKey).not.toEqual(mockAuthKey);
    expect(result.event.appAuthKey).toEqual(sha256MhashedMockAuthKey);

    // test custom objects were redacted correctly
    validateEventArrayData(result.event.data, kafkaAdapterLogMock.event.data);
  });

  const validateEventArrayData = (data: any[], originalData: any[]) => {
    data.forEach((value: any, index: number) => {
      if (value.name.localeCompare('firstName') === 0) {
        expect(value.value).not.toEqual(mockFirstName);
        expect(value.value).toEqual(sha256HashedFirstName);
      } else if (value.name.localeCompare('lastName') === 0) {
        expect(value.value).not.toEqual(mockLastName);
        expect(value.value).toEqual(sha256HashedLastName);
      } else if (value.name.localeCompare('fullName') === 0) {
        expect(value.value).not.toEqual(mockFullName);
        expect(value.value).toEqual(sha256HashedFullName);
      } else if (value.name.localeCompare('email') === 0) {
        expect(value.value).not.toEqual(mockEmail);
        expect(value.value).toEqual(sha256HashedEmail);
      } else if (value.name.localeCompare('mdn') === 0) {
        expect(value.value).not.toEqual(mockMdn);
        expect(value.value).toEqual(sha256HashedMdn);
      } else if (value.name.localeCompare('appAuthKey') === 0) {
        expect(value.value).not.toEqual(mockAuthKey);
        expect(value.value).toEqual(sha256MhashedMockAuthKey);
      } else {
        expect(value.value).toEqual(originalData[index].value);
      }
    });
  };
});
