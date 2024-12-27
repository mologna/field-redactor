import * as crypto from 'crypto';
export const mockEmail = 'foo.bar@example.com';
export const sha256HashedEmail = crypto.createHash('sha256').update(mockEmail).digest('hex');

export const mockAddress = '123 Main St';
export const sha256HashedAddress = crypto.createHash('sha256').update(mockAddress).digest('hex');

export const mockCity = 'Anytown';
export const sha256HashedCity = crypto.createHash('sha256').update(mockCity).digest('hex');

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