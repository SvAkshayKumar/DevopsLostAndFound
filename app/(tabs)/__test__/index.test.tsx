import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../index';

// Mock navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
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
      }),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: jest.fn(),
      }),
    })),
  },
}));

describe('HomeScreen', () => {
  it('renders item list when data is fetched', async () => {
    const { getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Lost Wallet')).toBeTruthy();
    });

    expect(queryByText('No active items found')).toBeNull();
  });

  it('shows empty state when no items are returned', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from().order.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('No active items found')).toBeTruthy();
    });
  });
});
