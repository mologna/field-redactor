import * as crypto from 'crypto';
import { CustomObject, CustomObjectMatchType, FieldRedactorConfig } from '../../src/types';
import { FieldRedactor } from '../../src/fieldRedactor';
import { sqaLog1 } from '../mocks/realExampleMocks';
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
  mockMdn
} from '../mocks/cryptoMockValues';

const mockRedactor: (value: any) => Promise<string> = (value: any) =>
  Promise.resolve(crypto.createHash('sha256').update(value.toString()).digest('hex'));

describe('Real Examples', () => {
  it('Can correctly redact application logs from a real example', async () => {
    const eventDataCustomObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      value: 'name'
    };

    const config: FieldRedactorConfig = {
      redactor: mockRedactor,
      secretKeys: [/email/i, /mdn/i, /phone/i, /.+name$/i],
      customObjects: [eventDataCustomObject]
    };

    const fieldRedactor: FieldRedactor = new FieldRedactor(config);
    const result = await fieldRedactor.redact(sqaLog1);
    console.log(result);

    // test secrets were found correctly
    expect(result.destinations.email).not.toEqual(sqaLog1.destinations.email);
    expect(result.destinations.email).toEqual(sha256HashedEmail);
    expect(result.destinations.fullName).not.toEqual(sqaLog1.destinations.fullName);
    expect(result.destinations.fullName).toEqual(sha256HashedFullName);
    expect(result.destinations.mdn).not.toEqual(sqaLog1.destinations.mdn);
    expect(result.destinations.mdn).toEqual(sha256HashedMdn);

    // test custom objects were redacted correctly
    result.eventData.forEach((value: any, index: number) => {
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
      } else {
        expect(value.value).toEqual(sqaLog1.eventData[index].value);
      }
    });
  });
});
