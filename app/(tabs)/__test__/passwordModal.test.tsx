import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import PasswordModals from '../../item/passwordModal';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
      signOut: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}));

jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('PasswordModals', () => {
  const mockStyles = {
    modalOverlay: {},
    modalContent: {},
    modalTitle: {},
    input: {},
    input_new: {},
    button: {},
    buttonText: {},
    closeModalButton: {},
    inputContainer: {},
    requirements: {},
    requirementsTitle: {},
    requirementItem: {},
    requirementDot: {},
    eyeIcon: {},
  };

  const defaultProps = {
    isPasswordModalOpen: true,
    setIsPasswordModalOpen: jest.fn(),
    isResetModalOpen: false,
    setIsResetModalOpen: jest.fn(),
    user: { email: 'test@example.com' },
    styles: mockStyles,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Forgot Password modal', () => {
    render(<PasswordModals {...defaultProps} />);
    expect(screen.getByText('Forgot Password')).toBeTruthy();
  });

  it('should update password after OTP verification', async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });

    render(<PasswordModals {...defaultProps} />);

    // Enter OTP
    fireEvent.changeText(screen.getByPlaceholderText('Enter OTP'), '123456');
    fireEvent.press(screen.getByText('Verify OTP'));

    // Wait for New Password fields to appear
    const newPasswordInput = await waitFor(() => screen.getByPlaceholderText('New Password'), {
      timeout: 2000,
    });
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');

    // Fill out new password fields
    fireEvent.changeText(newPasswordInput, 'NewPass123!');
    fireEvent.changeText(confirmPasswordInput, 'NewPass123!');
    fireEvent.press(screen.getByText('Reset Password'));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Password updated successfully');
    });
  });

  it('closes modal when close button is clicked', async () => {
    render(<PasswordModals {...defaultProps} />);

    // Wait for the button to appear
    const closeButton = await waitFor(() => screen.getByTestId('closeModalButton'), {
      timeout: 2000,
    });

    fireEvent.press(closeButton);
    expect(defaultProps.setIsPasswordModalOpen).toHaveBeenCalledWith(false);
  });
});
