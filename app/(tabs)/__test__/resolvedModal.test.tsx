import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import ResolvedItemDetailsModal from '../../item/resolvedModal';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

// Mock Supabase
const mockSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: mockSingle,
    })),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const defaultProps = {
  isVisible: true,
  onClose: jest.fn(),
  itemId: '123',
};

const mockFeedback = {
  id: '1',
  item_id: '123',
  helper_name: 'Jane Doe',
  rating: 4,
  experience: 'Jane was extremely helpful and guided me through the entire process smoothly.',
  created_at: '2024-01-01T12:00:00Z',
};

describe('ResolvedItemDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with loading state', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockFeedback, error: null });

    render(<ResolvedItemDetailsModal {...defaultProps} />);
    expect(screen.getByText('Loading feedback details...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Resolution Details')).toBeTruthy();
    });
  });

  it('displays feedback details when fetched successfully', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockFeedback, error: null });

    render(<ResolvedItemDetailsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Resolved By')).toBeTruthy();
      expect(screen.getByText('Rating')).toBeTruthy();
      expect(screen.getByText('Experience')).toBeTruthy();
      expect(screen.getByText(/Jane was extremely helpful/)).toBeTruthy();
    });
  });

  it('toggles read more and show less', async () => {
    const longText = 'a'.repeat(200);
    const longFeedback = { ...mockFeedback, experience: longText };

    mockSingle.mockResolvedValueOnce({ data: longFeedback, error: null });

    render(<ResolvedItemDetailsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Read more')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Read more'));
    expect(screen.getByText('Show less')).toBeTruthy();
  });

  it('displays message if no feedback is found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    render(<ResolvedItemDetailsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No feedback details available')).toBeTruthy();
    });
  });

  it('shows alert on fetch error', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Something went wrong' },
    });

    render(<ResolvedItemDetailsModal {...defaultProps} />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load feedback details');
    });
  });
});
