import type {Config} from 'jest';

const config: Config = {
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/dist'],
  testMatch: ['**/*.test.ts'],
  preset: 'ts-jest',
};

export default config;
