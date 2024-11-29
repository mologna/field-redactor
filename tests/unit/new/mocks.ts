export const validInputWithAllTypes = {
  password: "password123",
  username: "admin",
  date: new Date(),
  loginFunc: () => {},
  isUserLoggedIn: true,
  userId: 12345,
  acctBalance: 100.00,
  parentAccount: null,
  children: undefined
};

export const validNestedInputWithAllTypes = {
  password: "password123",
  username: "admin",
  date: new Date(),
  loginFunc: () => {},
  isUserLoggedIn: true,
  userId: 12345,
  acctBalance: 100.00,
  parentAccount: {
    password: "password123",
    username: "admin",
    date: new Date(),
    loginFunc: () => {},
    isUserLoggedIn: true,
    userId: 12345,
    acctBalance: 100.00,
    parentAccount: {
      password: "password123",
      username: "admin",
      date: new Date(),
      loginFunc: () => {},
      isUserLoggedIn: true,
      userId: 12345,
      acctBalance: 100.00,
      parentAccount: null,
      children: undefined
    },
    children: undefined
  },
  children: undefined
};