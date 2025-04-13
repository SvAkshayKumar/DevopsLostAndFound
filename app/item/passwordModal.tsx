import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import PropTypes from 'prop-types';

const PasswordModals = ({
  isPasswordModalOpen,
  setIsPasswordModalOpen,
  isResetModalOpen,
  setIsResetModalOpen,
  user,
  styles,
}) => {
  const [otp, setOtp] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);

  // Reset modal states
  const resetPasswordStates = () => {
    setOtp('');
    setIsOtpVerified(false);
    setNewPassword('');
    setConfirmPassword('');
    setOldPassword('');
    setIsOldPasswordVerified(false);
  };

  const [passwordRequirements, setPasswordRequirements] = useState([
    { label: '8-16 characters', regex: /^.{8,16}$/, met: false },
    { label: 'At least one number', regex: /\d/, met: false },
    {
      label: 'At least one special character',
      regex: /[!@#$%^&*(),.?":{}|<>]/,
      met: false,
    },
  ]);

  useEffect(() => {
    const updatedRequirements = passwordRequirements.map((req) => ({
      ...req,
      met: req.regex.test(newPassword),
    }));
    setPasswordRequirements(updatedRequirements);
  }, [newPassword]);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const allRequirementsMet = passwordRequirements.every((req) => req.met);
    if (!allRequirementsMet) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      Alert.alert('Success', 'Password updated successfully');
      resetPasswordStates();
      setIsPasswordModalOpen(false);
      setIsResetModalOpen(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password');
    }
  };

  const handleSendOtp = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'User email not found');
      return;
    }
    try {
      const response = await fetch('https://otp-service-and-feedback-using-sq-lite.vercel.app/api/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          type: 'numeric',
          organization: 'RVU Lost & Found',
          subject: 'OTP Verification',
        }),
      });
  
      if (!response.ok) throw new Error('Failed to send OTP');
  
      Alert.alert('Success', 'OTP has been sent to your email');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };
  
  const handleVerifyOtp = async () => {
    try {
      const response = await fetch('https://otp-service-and-feedback-using-sq-lite.vercel.app/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          otp,
        }),
      });
  
      if (!response.ok) throw new Error('Invalid OTP');
  
      setIsOtpVerified(true); // Update state on successful verification
      Alert.alert('Success', 'Email verified successfully');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    }
  };
  
  // Verify Old Password
  const handleVerifyOldPassword = async () => {
    try {
      if (!user?.email) {
        Alert.alert('Error', 'User email not found');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (error) throw error;
      setIsOldPasswordVerified(true);
    } catch (error) {
      console.error('Error verifying password:', error);
      Alert.alert('Error', 'Invalid password');
    }
  };

  const PasswordRequirements = () => (
    <View style={styles.requirements}>
      <Text style={styles.requirementsTitle}>Password Requirements:</Text>
      {passwordRequirements.map((req, index) => (
        <View key={index} style={styles.requirementItem}>
          <View
            style={[
              styles.requirementDot,
              { backgroundColor: req.met ? '#10b981' : '#94a3b8' },
            ]}
          />
          <Text style={{ color: req.met ? '#10b981' : '#94a3b8' }}>
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <>
      {/* Forgot Password Modal */}
      <Modal
        visible={isPasswordModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsPasswordModalOpen(false);
          resetPasswordStates();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Forgot Password</Text>

            {!isOtpVerified ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleVerifyOtp}
                >
                  <Text style={styles.buttonText}>Verify OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => handleSendOtp()} // Fixed to prevent immediate invocation
                >
                  <Text style={styles.linkText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                <PasswordRequirements />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.buttonText}>Reset Password</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setIsPasswordModalOpen(false);
                resetPasswordStates();
              }}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={isResetModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsResetModalOpen(false);
          resetPasswordStates();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Password</Text>

            {!isOldPasswordVerified ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Current Password"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleVerifyOldPassword}
                >
                  <Text style={styles.buttonText}>Verify Password</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                <PasswordRequirements />

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.buttonText}>Update Password</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setIsResetModalOpen(false);
                resetPasswordStates();
              }}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

PasswordModals.propTypes = {
  isPasswordModalOpen: PropTypes.bool.isRequired,
  setIsPasswordModalOpen: PropTypes.func.isRequired,
  isResetModalOpen: PropTypes.bool.isRequired,
  setIsResetModalOpen: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
  user: PropTypes.shape({
    email: PropTypes.string,
  }), // Optional user prop
};

export default PasswordModals;