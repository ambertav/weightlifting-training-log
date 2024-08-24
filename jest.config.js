module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],  // Matches test files
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],  // File extensions to be handled
    transform: {
      '^.+\\.ts?$': 'ts-jest',  // Transform TypeScript files using ts-jest
    },
  };
  