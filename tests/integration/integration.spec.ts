import * as crypto from 'crypto';
import { FieldRedactor } from '../../src/fieldRedactor';
import { CustomObject } from '../../src/types';
import { Redactor } from '../../src/redactor';
import {
  logDataToRedact,
  sha256HashedAddress,
  sha256HashedBalance,
  sha256HashedCity,
  sha256HashedEmail,
  sha256HashedMdn,
  sha256HashedName,
  sha256HashedUserId
} from '../mocks/logMocks';

describe('FieldRedactor Integration Test', () => {
  it('Should redact all secret fields in a document with custom objects', () => {
    // Setup
    const secretKeys = [/email/, /mdn/, /balance/, /address/, /city/, /fullname/i];
    const customDataObject: CustomObject = {
      name: false,
      type: false,
      value: 'name'
    };

    const customUserObject: CustomObject = {
      id: true,
      roles: false,
      groups: false
    };

    const redactor: Redactor = (val: any) => crypto.createHash('sha256').update(val.toString()).digest('hex');

    const fieldRedactor = new FieldRedactor({
      secretKeys,
      redactor,
      customObjects: [customDataObject, customUserObject]
    });

    // Execute
    const result = fieldRedactor.redact(logDataToRedact);

    // Assert
    expect(result['@timestamp']).toEqual(logDataToRedact['@timestamp']);
    expect(result.level).toEqual(logDataToRedact.level);
    expect(result.appId).toEqual(logDataToRedact.appId);
    expect(result.clientName).toEqual(logDataToRedact.clientName);
    expect(result.parentSystem).toEqual(logDataToRedact.parentSystem);
    expect(result.owner).toEqual(logDataToRedact.owner);
    expect(result.executedCampaigns).toStrictEqual(logDataToRedact.executedCampaigns);
    expect(result.otherCampaigns).toStrictEqual(logDataToRedact.otherCampaigns);
    expect(result.correlationId).toEqual(logDataToRedact.correlationId);
    expect(result.transactionId).toEqual(logDataToRedact.transactionId);
    expect(result.destinations).toEqual({
      email: sha256HashedEmail,
      fullName: sha256HashedName,
      mdn: sha256HashedMdn
    });
    expect(result.user.id).toEqual(sha256HashedUserId);
    expect(result.user.roles).toStrictEqual(logDataToRedact.user.roles);
    expect(result.user.groups).toStrictEqual(logDataToRedact.user.groups);
    expect(result.data[0].value).toEqual(sha256HashedEmail);
    expect(result.data[1].value).toEqual(sha256HashedMdn);
    expect(result.data[2].value).toEqual(sha256HashedBalance);
    expect(result.data[3].value).toEqual(sha256HashedAddress);
    expect(result.data[4].value).toEqual(sha256HashedCity);
    expect(result.data[5].value).toEqual(logDataToRedact.data[5].value);
    expect(result.status).toEqual(logDataToRedact.status);
    expect(result.message).toEqual(logDataToRedact.message);
  });
});
