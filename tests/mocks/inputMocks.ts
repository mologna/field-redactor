export const validInputWithAllTypes = {
  password: 'password123',
  username: 'admin',
  date: new Date(),
  loginFunc: () => {},
  isUserLoggedIn: true,
  userId: 12345,
  acctBalance: 100.0
};

export const validInputIncludingNullAndUndefined = {
  ...validInputWithAllTypes,
  nullValue: null,
  undefinedValue: undefined
};

export const validNestedInputWithAllTypes = {
  password: 'password123',
  username: 'admin',
  date: new Date(),
  loginFunc: () => {},
  isUserLoggedIn: true,
  userId: 12345,
  acctBalance: 100.0,
  parentAccount: {
    password: 'password123',
    username: 'admin',
    date: new Date(),
    loginFunc: () => {},
    isUserLoggedIn: true,
    userId: 12345,
    acctBalance: 100.0,
    parentAccount: {
      password: 'password123',
      username: 'admin',
      date: new Date(),
      loginFunc: () => {},
      isUserLoggedIn: true,
      userId: 12345,
      acctBalance: 100.0
    }
  }
};
