import { mockAddress, mockBalance, mockCity, mockEmail, mockFullName, mockMdn, mockUserId } from './cryptoMockValues';

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
    fullName: mockFullName,
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
