import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import PasswordModals from '../../item/PasswordModal';
import { supabase } from '@/lib/supabase';

// Mocking supabase authentication
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
      signOut: jest.fn(() => Promise.resolve({ error: null })), // Mock the signOut method
      signInWithPassword: jest.fn(),
    },
  },
}));

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

  it('should render the Forgot Password modal', () => {
    render(<PasswordModals {...defaultProps} />);
    expect(screen.getByText('Forgot Password')).toBeTruthy();
  });

  it('should show OTP input and send OTP button when OTP is not verified', () => {
    render(<PasswordModals {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter OTP')).toBeTruthy();
    expect(screen.getByText('Verify OTP')).toBeTruthy();
    expect(screen.getByText('Resend OTP')).toBeTruthy();
  });

  it('should show password fields and password requirements after OTP verification', async () => {
    render(<PasswordModals {...defaultProps} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter OTP'), '123456');
    fireEvent.press(screen.getByText('Verify OTP'));

    await waitFor(() => expect(screen.getByText('New Password')).toBeTruthy());
    expect(screen.getByText('Password Requirements:')).toBeTruthy();
  });

  it('should call the handleVerifyOtp function on pressing Verify OTP', async () => {
    const { handleVerifyOtp } = require('./PasswordModals');
    const spy = jest.spyOn(handleVerifyOtp, 'mockImplementation');
    render(<PasswordModals {...defaultProps} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter OTP'), '123456');
    fireEvent.press(screen.getByText('Verify OTP'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it('should show alert if OTP is invalid', async () => {
    render(<PasswordModals {...defaultProps} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter OTP'), 'wrongOtp');
    fireEvent.press(screen.getByText('Verify OTP'));

    await waitFor(() =>
      expect(screen.getByText('Invalid OTP. Please try again.')).toBeTruthy()
    );
  });

  it('should successfully update password', async () => {
    // Now correctly mock the updateUser and signOut functions
    supabase.auth.updateUser.mockResolvedValueOnce({ data: {}, error: null });
    supabase.auth.signOut.mockResolvedValueOnce({ error: null });

    render(<PasswordModals {...defaultProps} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter OTP'), '123456');
    fireEvent.press(screen.getByText('Verify OTP'));

    fireEvent.changeText(screen.getByPlaceholderText('New Password'), 'NewPass123!');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'NewPass123!');
    fireEvent.press(screen.getByText('Reset Password'));

    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalled());
    expect(screen.getByText('Password updated successfully')).toBeTruthy();
  });

  it('should show alert if password requirements are not met', async () => {
    render(<PasswordModals {...defaultProps} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter OTP'), '123456');
    fireEvent.press(screen.getByText('Verify OTP'));

    fireEvent.changeText(screen.getByPlaceholderText('New Password'), 'short');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'short');
    fireEvent.press(screen.getByText('Reset Password'));

    await waitFor(() =>
      expect(screen.getByText('Please meet all password requirements')).toBeTruthy()
    );
  });

  it('should show alert if passwords do not match', async () => {
    render(<PasswordModals {...defaultProps} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter OTP'), '123456');
    fireEvent.press(screen.getByText('Verify OTP'));

    fireEvent.changeText(screen.getByPlaceholderText('New Password'), 'NewPass123!');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'DifferentPass!');
    fireEvent.press(screen.getByText('Reset Password'));

    await waitFor(() =>
      expect(screen.getByText('Passwords do not match')).toBeTruthy()
    );
  });

  it('should call handleSendOtp function when Resend OTP button is clicked', async () => {
    const spy = jest.spyOn(require('./PasswordModals').handleSendOtp, 'mockImplementation');
    render(<PasswordModals {...defaultProps} />);
    fireEvent.press(screen.getByText('Resend OTP'));

    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it('should close the modal when the close button is clicked', () => {
    render(<PasswordModals {...defaultProps} />);
    fireEvent.press(screen.getByTestId('closeModalButton'));
    expect(defaultProps.setIsPasswordModalOpen).toHaveBeenCalledWith(false);
  });
});
