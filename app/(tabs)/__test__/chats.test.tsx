import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ChatsScreen from '../chats'; // Update the path accordingly
import { supabase } from '@/lib/supabase';

// Mock navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((cb) => cb('SUBSCRIBED')),
    })),
    removeChannel: jest.fn(),
  },
}));

describe('ChatsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty state when no contacts are found', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: '123' } },
      error: null,
    });

    const { getByText } = render(<ChatsScreen />);

    await waitFor(() => {
      expect(getByText(/No connections yet|Login to view Connections/i)).toBeTruthy();
    });
  });

  it('renders contact item correctly when contact data is available', async () => {
    const mockContactAttempts = [
      {
        id: 1,
        contacted_by: '123',
        posted_user_id: '456',
        created_at: '2024-05-01T10:00:00Z',
      },
    ];

    const mockProfiles = [
      {
        id: '456',
        full_name: 'John Doe',
        email: 'john@example.com',
        avatar_url: '',
        created_at: '2024-04-30T10:00:00Z',
      },
    ];

    // Mock Supabase auth
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: '123' } },
      error: null,
    });

    // Mock contact_attempts
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      return {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((cb) => {
          if (table === 'contact_attempts') {
            return cb({ data: mockContactAttempts, error: null });
          }
          if (table === 'profiles') {
            return cb({ data: mockProfiles, error: null });
          }
        }),
      };
    });

    const { getByText } = render(<ChatsScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('john@example.com')).toBeTruthy();
    });
  });
});
