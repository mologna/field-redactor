import * as crypto from 'crypto';
import * as moment from 'moment';
import { FieldRedactor } from '../../src/fieldRedactor';
import { CustomObject, CustomObjectMatchType, Redactor } from '../../src/types';
import { logDataToRedact } from '../mocks/logMocks';
import {
  sha256HashedAddress,
  sha256HashedBalance,
  sha256HashedCity,
  sha256HashedEmail,
  sha256HashedFalse,
  sha256HashedFullName,
  sha256HashedMdn,
  sha256HashedMockClientName,
  sha256HashedTrue,
  sha256HashedUserId
} from '../mocks/cryptoMockValues';

describe('FieldRedactor Integration Test', () => {
  it('Should redact all secret fields in a document with custom objects', async () => {
    // Setup
    const secretKeys = [/email/, /mdn/, /balance/, /address/, /city/, /fullname/i];
    const customDataObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      type: CustomObjectMatchType.Ignore,
      value: 'name'
    };

    const customUserObject: CustomObject = {
      id: CustomObjectMatchType.Shallow,
      roles: CustomObjectMatchType.Ignore,
      groups: CustomObjectMatchType.Ignore
    };

    const redactor: Redactor = (val: any) =>
      Promise.resolve(crypto.createHash('sha256').update(val.toString()).digest('hex'));

    const fieldRedactor = new FieldRedactor({
      secretKeys,
      redactor,
      customObjects: [customDataObject, customUserObject]
    });

    // Execute
    const result = await fieldRedactor.redact(logDataToRedact);

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
      fullName: sha256HashedFullName,
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

  it('Should be able to handle everything and the kitchen sink when configured as such without secret objects', async () => {
    const redactor: Redactor = (val: any) => {
      if (val === null || val === undefined) {
        return Promise.resolve('FOOBAR');
      }

      return Promise.resolve(crypto.createHash('sha256').update(val.toString()).digest('hex'));
    };

    const secretKeys = [/clientName/, /someNullValue/i, /someUndefinedValue/i, /booleanValue/i, /zuluFormattedDate/i];
    const deepSecretKeys = [/destination/i, /data/i];
    const fullSecretKeys = [/user/i];
    const fieldRedactor = new FieldRedactor({
      ignoreBooleans: false,
      ignoreDates: [moment.ISO_8601],
      ignoreNullOrUndefined: false,
      redactor,
      secretKeys,
      deepSecretKeys,
      fullSecretKeys
    });
    const hashedUserData = await redactor(JSON.stringify(logDataToRedact.user));
    const result = await fieldRedactor.redact(logDataToRedact);
    expect(result.appId).toEqual(logDataToRedact.appId);
    expect(result.clientName).toEqual(sha256HashedMockClientName);
    expect(result.parentSystem).toEqual(logDataToRedact.parentSystem);
    expect(result.user).toEqual(hashedUserData);
    expect(result.destinations.email).toEqual(sha256HashedEmail);
    expect(result.destinations.fullName).toEqual(sha256HashedFullName);
    expect(result.destinations.mdn).toEqual(sha256HashedMdn);
    expect(result.someNullValue).toEqual('FOOBAR');
    expect(result.someUndefinedValue).toEqual('FOOBAR');
    expect(result.someBooleanValue).toEqual(sha256HashedTrue);
    expect(result.someFalseBooleanValue).toEqual(sha256HashedFalse);
    expect(result.zuluFormattedDate).toEqual(logDataToRedact.zuluFormattedDate);
    result.data.forEach((data: any, index: number) => {
      expect(data.name).not.toEqual(logDataToRedact.data[index].name);
      expect(data.type).not.toEqual(logDataToRedact.data[index].type);
      expect(data.value).not.toEqual(logDataToRedact.data[index].value);
    });
  });
});
