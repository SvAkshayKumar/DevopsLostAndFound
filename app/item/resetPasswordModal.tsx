import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type PasswordRequirement = {
  label: string;
  regex: RegExp;
  met: boolean;
};

const passwordRequirements: PasswordRequirement[] = [
  { label: '8-16 characters', regex: /^.{8,16}$/, met: false },
  { label: 'At least one number', regex: /\d/, met: false },
  { label: 'At least one special character', regex: /[!@#$%^&*(),.?":{}|<>]/, met: false },
];

type ResetPasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function ResetPasswordModal({ visible, onClose }: ResetPasswordModalProps) {
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetResendDisabled, setResetResendDisabled] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(30);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetPasswordStates = () => {
    setResetEmail('');
    setResetOtp('');
    setResetOtpSent(false);
    setResetOtpVerified(false);
    setNewPassword('');
    setConfirmPassword('');
    setResetResendDisabled(false);
    setResetCountdown(30);
    setShowPassword(false);
  };

  const handleClose = () => {
    onClose();
    resetPasswordStates();
  };

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith('@rvu.edu.in');
  };

  const handleGenerateOTP = async () => {
    if (!resetEmail || !validateEmail(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid RVU email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://otp-service-beta.vercel.app/api/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetEmail,
          type: 'numeric',
          organization: 'RVU Lost & Found',
          subject: 'OTP Verification',
        }),
      });

      if (!response.ok) throw new Error('Failed to send OTP');

      setResetOtpSent(true);
      setResetResendDisabled(true);
      Alert.alert('Success', 'OTP has been sent to your email');

      const timer = setInterval(() => {
        setResetCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setResetResendDisabled(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!resetOtp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://otp-service-beta.vercel.app/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtp,
        }),
      });

      if (!response.ok) throw new Error('Invalid OTP');

      setResetOtpVerified(true);
      Alert.alert('Success', 'Email verified successfully');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetOtpVerified) {
      Alert.alert('Error', 'Please verify your email first');
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter both passwords');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const allRequirementsMet = passwordRequirements.every((req) => req.regex.test(newPassword));
    if (!allRequirementsMet) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      // Use the admin API to update the password directly
      const { data: userResponse, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', resetEmail)
        .single();

      if (userError) throw userError;

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userResponse.id,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      Alert.alert('Success', 'Password updated successfully', [
        { text: 'OK', onPress: handleClose }
      ]);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {!resetOtpVerified ? (
            <>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="RVU Email (@rvu.edu.in)"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!resetOtpSent}
                />
              </View>

              {resetOtpSent ? (
                <>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter OTP"
                      value={resetOtp}
                      onChangeText={setResetOtp}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                  <View style={styles.otpActions}>
                    <TouchableOpacity
                      style={[styles.otpButton, loading && styles.buttonDisabled]}
                      onPress={handleVerifyOTP}
                      disabled={loading}
                    >
                      <Text style={styles.otpButtonText}>
                        {loading ? 'Verifying...' : 'Verify OTP'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.otpButton, resetResendDisabled && styles.buttonDisabled]}
                      onPress={handleGenerateOTP}
                      disabled={resetResendDisabled}
                    >
                      <Text style={styles.otpButtonText}>
                        {resetResendDisabled
                          ? `Resend in ${resetCountdown}s`
                          : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleGenerateOTP}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>

              <View style={styles.requirements}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                {passwordRequirements.map((req, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <View
                      style={[
                        styles.requirementDot,
                        { backgroundColor: req.regex.test(newPassword) ? '#10b981' : '#94a3b8' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        { color: req.regex.test(newPassword) ? '#10b981' : '#94a3b8' },
                      ]}
                    >
                      {req.label}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeIcon: {
    padding: 8,
  },
  requirements: {
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  requirementText: {
    fontSize: 14,
  },
  button: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpButton: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 12,
    flex: 0.48,
    alignItems: 'center',
  },
  otpButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});