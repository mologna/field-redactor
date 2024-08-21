export const SECRET_KEYS = [
  // generic
  /passw(or)?d/i,
  /^pw$/,
  /^pass$/i,
  /secret/i,
  /token/i,
  /api[-._]?key/i,
  /session[-._]?id/i,
  /AuthKey/i,
  /\bkey/i,

  // contact and personal information
  /mdn/i,
  /phone/i,
  /phonenumber/i,
  /email/i,
  /business/i,
  /line/i,
  /address/i,
  /first/i,
  /last/i,
  /full/i,
  /fullname/i,
  /command/i,
  /ssn/i,

  // authentication and security information
  /appAuthKey/i,
  /authKey/i,
  /authorization/i,
  /auth/i,
  /security/i,
  /\bimei\b/i,
  /account/i,
  /acc?tNumber/i,
  /accountNumber/i,
  /identifier/i,
  /\bban\b/i,
  /\bpin\b/i,
  /principal/i,
  // specific
  /^connect\.sid$/, // https://github.com/expressjs/session
  /\btn\b/i,
  /zipCode/i,
  /zip/i,
  /appId/i
];

