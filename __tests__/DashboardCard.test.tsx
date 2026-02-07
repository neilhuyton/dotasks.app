// __tests__/DashboardCard.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardCard } from '../src/components/DashboardCard';
import { ScaleIcon } from 'lucide-react';
import '@testing-library/jest-dom';

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

describe('DashboardCard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultProps = {
    title: 'Current Weight',
    icon: ScaleIcon,
    value: '70.5 kg',
    description: 'Latest recorded weight',
    buttonText: 'Record Weight',
    buttonLink: '/weight',
    testId: 'current-weight-card',
  };

  const renderCard = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DashboardCard {...defaultProps} {...props} />
      </QueryClientProvider>,
    );
  };

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders correctly with given props', () => {
    renderCard();

    expect(screen.getByTestId('current-weight-card')).toBeInTheDocument();
    expect(screen.getByText('Current Weight')).toBeInTheDocument();
    expect(screen.getByText('70.5 kg')).toBeInTheDocument();
    expect(screen.getByText('Latest recorded weight')).toBeInTheDocument();
    expect(screen.getByTestId('current-weight-card-button')).toHaveTextContent('Record Weight');
  });

  it('shows "No data" message when value is null', () => {
    renderCard({
      value: null,
      description: 'Record your weight',
    });

    expect(screen.getByTestId('current-weight-card')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Record your weight')).toBeInTheDocument();
    expect(screen.getByTestId('current-weight-card-button')).toHaveTextContent('Record Weight');
  });

  it('navigates to buttonLink when button is clicked', async () => {
    renderCard();

    const button = screen.getByTestId('current-weight-card-button');
    await userEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/weight' });
  });
});