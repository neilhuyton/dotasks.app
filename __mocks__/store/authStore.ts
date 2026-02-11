// __mocks__/store/authStore.ts
import { vi, type Mock } from 'vitest';
import jwt from 'jsonwebtoken';

// Define the shape of the auth state explicitly
interface AuthState {
  isLoggedIn: boolean;
  userId: string;
  token: string;
  refreshToken: string;
  login: Mock;
  logout: Mock;
}

// Define the shape of the store state, including getState and setState
interface AuthStoreState extends AuthState {
  getState: () => AuthState;
  setState: (newState: Partial<AuthState>) => void;
}

export const generateToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '1h',
  });
};

export const mockAuthState: AuthState = {
  isLoggedIn: true,
  userId: 'test-user-id',
  token: generateToken('test-user-id'),
  refreshToken: 'valid-refresh-token',
  login: vi.fn(),
  logout: vi.fn(),
};

let state: AuthState = { ...mockAuthState };

// Define the store state with getState and setState
const storeState: AuthStoreState = {
  ...state,
  getState: () => state,
  setState: (newState: Partial<AuthState>) => {
    state = { ...state, ...newState };
  },
};

// Mock useAuthStore with a generic selector type
export const useAuthStore = vi.fn(<T>(selector?: (state: AuthStoreState) => T): T => {
  // If a selector is provided, apply it (for routes.ts beforeLoad)
  if (selector) {
    return selector(storeState);
  }
  // Otherwise, return the full state (for Root.tsx destructuring)
  return storeState as T;
});