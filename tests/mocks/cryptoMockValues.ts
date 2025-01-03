import * as crypto from 'crypto';
export const mockEmail = 'foo.bar@example.com';
export const sha256HashedEmail = crypto.createHash('sha256').update(mockEmail).digest('hex');

export const mockAddress = '123 Main St';
export const sha256HashedAddress = crypto.createHash('sha256').update(mockAddress).digest('hex');

export const mockId = 111;
export const sha256HashedId = crypto.createHash('sha256').update(mockId.toString()).digest('hex');

export const mockClientName = 'CLIENT_1';
export const sha256HashedMockClientName = crypto.createHash('sha256').update(mockClientName).digest('hex');

export const mockOwner = 'OWNER_1';
export const sha256HashedOwner = crypto.createHash('sha256').update(mockOwner).digest('hex');

export const mockCity = 'Anytown';
export const sha256HashedCity = crypto.createHash('sha256').update(mockCity).digest('hex');

export const sha256HashedTrue = crypto.createHash('sha256').update('true').digest('hex');
export const sha256HashedFalse = crypto.createHash('sha256').update('false').digest('hex');

export const mockFirstName = 'John';
export const mockLastName = 'Snow';
export const mockFullName = `${mockFirstName} ${mockLastName}`;
export const sha256HashedFullName = crypto.createHash('sha256').update(mockFullName).digest('hex');
export const sha256HashedFirstName = crypto.createHash('sha256').update(mockFirstName).digest('hex');
export const sha256HashedLastName = crypto.createHash('sha256').update(mockLastName).digest('hex');

export const mockMdn = 1234567890;
export const sha256HashedMdn = crypto.createHash('sha256').update(mockMdn.toString()).digest('hex');

export const mockBalance = 123.45;
export const sha256HashedBalance = crypto.createHash('sha256').update(mockBalance.toString()).digest('hex');

export const mockUserId = 12345;
export const sha256HashedUserId = crypto.createHash('sha256').update(mockUserId.toString()).digest('hex');

export const mockAuthKey = 'cf388510-a4f2-qqqq-840a-659a2b212b43';
export const sha256MhashedMockAuthKey = crypto.createHash('sha256').update(mockAuthKey.toString()).digest('hex');
