import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FeedbackModal from '../../item/feedbackModal'; // Adjust path if needed
import { Alert } from 'react-native';

// Mock Alert API
jest.spyOn(Alert, 'alert');

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('FeedbackModal Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with valid itemId', () => {
    const { getByPlaceholderText, getByText } = render(
      <FeedbackModal
        isVisible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        type="lost"
        itemId="123"
      />
    );

    expect(getByPlaceholderText("Helper's Name / Description")).toBeTruthy();
    expect(getByText('Submit Feedback')).toBeTruthy();
  });

  it('does not call onSubmit when helper name and rating are missing', () => {
    const { getByText } = render(
      <FeedbackModal
        isVisible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        type="lost"
        itemId="123"
      />
    );

    const submitButton = getByText('Submit Feedback');
    fireEvent.press(submitButton);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
