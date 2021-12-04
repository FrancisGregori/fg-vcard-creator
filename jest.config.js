module.exports = {
  preset: "ts-jest",
  modulePathIgnorePatterns: ["<rootDir>/tests/"],
  setupFiles: ["jest-date-mock"],
  testRegex: "(/__tests__/.*)\\.test\\.[jt]s$",
};
