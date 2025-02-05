import { mockAuthKey, mockEmail, mockFirstName, mockFullName, mockLastName, mockMdn } from './cryptoMockValues';

export const eventProcessingLogsMock = {
  '@timestamp': '2024-12-27T16:52:51.293Z',
  appId: '271',
  appAuthKey: mockAuthKey,
  approvedCampaigns: [],
  buildVersion: '1.0.74',
  campaignExecutionDetails: {
    Foobar: {
      status: 'STAGED',
      campaignId: '6c4c2acc-5081-4283-8b20-ae11d4baa06d',
      campaignTitle: 'Foobar',
      clientNames: ['CLIENT_1', 'CLIENT_2'],
      commType: 'SMS',
      filters: {},
      programId: '84',
      requestId: 'a994ac11-7513-4338-860e-d8f8beca3634',
      sent: true,
      success: true
    }
  },
  campaignsFiltered: [],
  campaignsForOtherClients: [],
  clientName: 'CLIENT_2',
  correlationId: '53a6a04e-776c-4b5f-ad4f-087ec073dc68',
  destinations: {
    email: mockEmail,
    fullName: mockFullName,
    mdn: `${mockMdn}`
  },
  eventData: [
    { name: 'impliedTransType', value: 'A' },
    { name: 'clientChannelId', value: 'dummyvalue' },
    { name: 'clientProductSKUNumber', value: '3002' },
    { name: 'marketCode', value: '0028' },
    { name: 'region', value: 'DM' },
    { name: 'firstName', value: mockFirstName },
    { name: 'lastName', value: mockLastName },
    { name: 'fullName', value: mockFullName },
    { name: 'email', value: mockEmail },
    { name: 'agreementPurchaseDate', value: '2024-12-27' },
    { name: 'mdn', value: mockMdn },
    { name: 'subscriptionNumber', value: '09913116629999' },
    { name: 'sourceRefID1', value: '09913116629999' },
    { name: 'sourceRefID2', value: '09913116629999' },
    { name: 'sourceRefID3', value: '7ab0fcf9-09d9-4392-9712-e20d13a10aaa' }
  ],
  eventId: 'a994ac11-7513-4338-860e-d8f8beca3634',
  eventName: 'HOME-SUBSCRIPTION-PROGRAM-VERIZON-PROTECT-HOME',
  level: 'info',
  message:
    'Event {HOME-SUBSCRIPTION-PROGRAM-VERIZON-PROTECT-HOME:a994ac11-7513-4338-860e-d8f8beca3634} was successfully processed. [1] campaign(s) were triggered with [1/1] communications successfully staged in AMP. [0] communications were not sent to AMP due to missing required data. [1] campaign(s) were unapproved but triggered in nonprod environment. {0} campaigns were not triggered due to client configuration. {0} campaigns were filtered.',
  owner: 'event-streaming',
  parentSystem: 'Kafka',
  serviceName: 'event-worker',
  timestamp: '2024-12-27T16:52:51.293Z',
  transactionId: 'cf388510-158f-4791-840a-659a2b212b43',
  unapprovedCampaigns: ['Foobar']
};

export const kafkaAdapterLogMock = {
  '@timestamp': '2024-12-27T17:22:26.426Z',
  buildVersion: '1.0.117',
  correlationId: '6f181c4b-e956-4021-ab4f-4bb46be731qq',
  event: {
    appAuthKey: mockAuthKey,
    appId: '271',
    clientName: 'CLIENT_1',
    correlationId: '6f181c4b-e956-4021-ab4f-4bb46be731qq',
    data: [
      { name: 'impliedTransType', value: 'A' },
      { name: 'clientChannelId', value: 'C10D49A78FF26637E0539B39030AA612' },
      { name: 'clientProductSKUNumber', value: 'HOMEPRO' },
      { name: 'firstName', value: mockFirstName },
      { name: 'lastName', value: mockLastName },
      { name: 'fullName', value: mockFullName },
      { name: 'email', value: mockEmail },
      { name: 'agreementPurchaseDate', value: '2024-11-19T17:22:12.276Z' },
      { name: 'mdn', value: mockMdn },
      { name: 'subscriptionNumber', value: '12345' },
      { name: 'sourceRefID1', value: '12345' },
      { name: 'sourceRefID2', value: '12345' },
      { name: 'sourceRefID3', value: '4428c2d8-c32a-4959-b930-4f714613d81b' }
    ],
    name: 'SOME-NAME-VALUE',
    owner: 'event-streaming',
    parentSystem: 'Kafka',
    transactionId: 'b1f0ec41-1514-4346-b512-251281179f93'
  },
  level: 'info',
  message: 'Kafka message queued for processing...',
  serviceName: 'kafka-adapter',
  timestamp: '2024-12-27T17:22:26.426Z',
  transactionId: 'b1f0ec41-1514-4346-b512-251281179f93'
};
