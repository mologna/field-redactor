import * as crypto from 'crypto';
export const mockEmail = 'foo.bar@example.com';
export const sha256HashedEmail = crypto.createHash('sha256').update(mockEmail).digest('hex');

export const mockAddress = '123 Main St';
export const sha256HashedAddress = crypto.createHash('sha256').update(mockAddress).digest('hex');

export const mockCity = 'Anytown';
export const sha256HashedCity = crypto.createHash('sha256').update(mockCity).digest('hex');

export const mockName = 'Mr. Foo Bar';
export const sha256HashedName = crypto.createHash('sha256').update(mockName).digest('hex');

export const mockMdn = 1234567890;
export const sha256HashedMdn = crypto.createHash('sha256').update(mockMdn.toString()).digest('hex');

export const mockBalance = 123.45;
export const sha256HashedBalance = crypto.createHash('sha256').update(mockBalance.toString()).digest('hex');

export const mockUserId = 12345;
export const sha256HashedUserId = crypto.createHash('sha256').update(mockUserId.toString()).digest('hex');

export const logDataToRedact = {
  '@timestamp': '2024-12-01T22:07:26.448Z',
  level: 'info',
  appId: 271,
  clientName: 'FOOBAR',
  parentSystem: 'SOME_SYSTEM',
  owner: 'some_owner',
  executedCampaigns: [],
  otherCampaigns: [],
  correlationId: '1234-5678-9012-3456',
  transactionId: '1234-5678-9012-1111',
  destinations: {
    email: mockEmail,
    fullName: mockName,
    mdn: mockMdn.toString()
  },
  user: {
    id: mockUserId,
    roles: ['admin', 'user'],
    groups: ['group1', 'group2']
  },
  data: [
    {
      name: 'email',
      type: 'String',
      value: mockEmail
    },
    {
      name: 'mdn',
      type: 'Number',
      value: mockMdn
    },
    {
      name: 'balance',
      type: 'Float',
      value: mockBalance
    },
    {
      name: 'address',
      type: 'String',
      value: mockAddress
    },
    {
      name: 'city',
      type: 'String',
      value: mockCity
    },
    {
      name: 'template_content',
      type: 'String',
      value: 'Hello, World!'
    }
  ],
  status: 'ACCEPTED',
  message: 'Message Accepted'
};
