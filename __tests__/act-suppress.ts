// test/setup/act-suppress.ts
// Reusable suppression of React act(...) warnings in tests
// Safe & targeted – only silences the specific harmless warning pattern

const originalConsoleError = console.error;

export function suppressActWarnings() {
  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const message = args[0];
      if (
        typeof message === "string" &&
        message.includes("act(") &&
        message.includes("update") &&
        message.includes("inside a test")
      ) {
        return; // swallow only act warnings
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });
}
