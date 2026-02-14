// __mocks__/handlers/index.ts

// Re-export individual handlers so the test can import them directly
export { loginHandler, refreshTokenHandler } from './auth';

export { registerHandler } from './register';
