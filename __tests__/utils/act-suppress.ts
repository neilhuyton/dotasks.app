// test/setup/act-suppress.ts

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
        return; 
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });
}
