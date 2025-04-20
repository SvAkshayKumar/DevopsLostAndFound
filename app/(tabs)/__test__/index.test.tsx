import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../index';

// Mock navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Let’s declare a reference to mockOrder so we can use it in tests
let mockOrder: jest.Mock;

// Mock supabase inline to avoid Babel transformation issues
jest.mock('../../../lib/supabase', () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  mockOrder = jest.fn();

  const fromMock = jest.fn(() => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
  }));

  const mockChannel = jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  }));

  return {
    supabase: {
      from: fromMock,
      channel: mockChannel,
    },
  };
});

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders item list when data is fetched', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: '1',
          title: 'Lost Wallet',
          description: 'Black leather wallet',
          type: 'lost',
          image_url: '',
          created_at: new Date().toISOString(),
          user_id: '123',
          user_email: 'john@example.com',
          status: 'active',
        },
      ],
      error: null,
    });

    const { getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Lost Wallet')).toBeTruthy();
    });

    expect(queryByText('No active items found')).toBeNull();
  });

  it('shows empty state when no items are returned', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('No active items found')).toBeTruthy();
    });
  });
});
