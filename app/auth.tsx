import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  User,
  X,
} from 'lucide-react-native';

type PasswordRequirement = {
  label: string;
  regex: RegExp;
  met: boolean;
};

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();

  // Reset Password Modal States
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetResendDisabled, setResetResendDisabled] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(30);

  const [passwordRequirements, setPasswordRequirements] = useState<
    PasswordRequirement[]
  >([
    { label: '8-16 characters', regex: /^.{8,16}$/, met: false },
    { label: 'At least one number', regex: /\d/, met: false },
    {
      label: 'At least one special character',
      regex: /[!@#$%^&*(),.?":{}|<>]/,
      met: false,
    },
  ]);

  useEffect(() => {
    if (isSignUp) {
      const updatedRequirements = passwordRequirements.map((req) => ({
        ...req,
        met: req.regex.test(password),
      }));
      setPasswordRequirements(updatedRequirements);
    }
  }, [password, isSignUp]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendDisabled && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setResendDisabled(false);
      setCountdown(30);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, countdown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetResendDisabled && resetCountdown > 0) {
      timer = setInterval(() => {
        setResetCountdown((prev) => prev - 1);
      }, 1000);
    } else if (resetCountdown === 0) {
      setResetResendDisabled(false);
      setResetCountdown(30);
    }
    return () => clearInterval(timer);
  }, [resetResendDisabled, resetCountdown]);

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith('@rvu.edu.in');
  };

  const handleGenerateOTP = async (isReset = false) => {
    const emailToUse = isReset ? resetEmail : email;

    if (!emailToUse || !validateEmail(emailToUse)) {
      Alert.alert('Error', 'Please enter a valid RVU email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://otp-service-beta.vercel.app/api/otp/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailToUse,
            type: 'numeric',
            organization: 'RVU Lost & Found',
            subject: 'OTP Verification',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send OTP');

      if (isReset) {
        setResetOtpSent(true);
        setResetResendDisabled(true);
      } else {
        setOtpSent(true);
        setResendDisabled(true);
      }
      Alert.alert('Success', 'OTP has been sent to your email');
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (isReset = false) => {
    const emailToUse = isReset ? resetEmail : email;
    const otpToVerify = isReset ? resetOtp : otp;

    if (!otpToVerify) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://otp-service-beta.vercel.app/api/otp/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailToUse,
            otp: otpToVerify,
          }),
        }
      );

      if (!response.ok) throw new Error('Invalid OTP');

      if (isReset) {
        setResetOtpVerified(true);
      } else {
        setOtpVerified(true);
      }
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

    const allRequirementsMet = passwordRequirements.every((req) =>
      req.regex.test(newPassword)
    );
    if (!allRequirementsMet) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      Alert.alert('Success', 'Password updated successfully');
      setResetModalVisible(false);
      resetPasswordStates();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordStates = () => {
    setResetEmail('');
    setResetOtp('');
    setResetOtpSent(false);
    setResetOtpVerified(false);
    setNewPassword('');
    setConfirmPassword('');
    setResetResendDisabled(false);
    setResetCountdown(30);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please use your RVU email address (@rvu.edu.in)');
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }

      if (!otpVerified) {
        Alert.alert('Error', 'Please verify your email first');
        return;
      }

      const allRequirementsMet = passwordRequirements.every((req) => req.met);
      if (!allRequirementsMet) {
        Alert.alert('Error', 'Please meet all password requirements');
        return;
      }

      if (!acceptedTerms) {
        Alert.alert('Error', 'Please accept the terms and conditions');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (signUpError) throw signUpError;
        Alert.alert('Success', 'Account created successfully. Please sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTerms = async () => {
    try {
      const url = 'https://github.com/SvAkshayKumar';
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open the URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open terms and conditions');
    }
  };

  const ResetPasswordModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={resetModalVisible}
      onRequestClose={() => {
        setResetModalVisible(false);
        resetPasswordStates();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <TouchableOpacity
              onPress={() => {
                setResetModalVisible(false);
                resetPasswordStates();
              }}
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
                      style={[
                        styles.otpButton,
                        loading && styles.buttonDisabled,
                      ]}
                      onPress={() => handleVerifyOTP(true)}
                      disabled={loading}
                    >
                      <Text style={styles.otpButtonText}>
                        {loading ? 'Verifying...' : 'Verify OTP'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.otpButton,
                        resetResendDisabled && styles.buttonDisabled,
                      ]}
                      onPress={() => handleGenerateOTP(true)}
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
                  onPress={() => handleGenerateOTP(true)}
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
                <Text style={styles.requirementsTitle}>
                  Password Requirements:
                </Text>
                {passwordRequirements.map((req, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <View
                      style={[
                        styles.requirementDot,
                        {
                          backgroundColor: req.regex.test(newPassword)
                            ? '#10b981'
                            : '#94a3b8',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        {
                          color: req.regex.test(newPassword)
                            ? '#10b981'
                            : '#94a3b8',
                        },
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

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignUp
            ? 'Sign up with your RVU email to start using the lost and found app'
            : 'Sign in to continue to your account'}
        </Text>
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <View style={styles.inputContainer}>
            <User size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Mail size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="RVU Email (@rvu.edu.in)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!otpVerified}
          />
        </View>

        {isSignUp && !otpVerified && (
          <View>
            {otpSent ? (
              <View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
                <View style={styles.otpActions}>
                  <TouchableOpacity
                    style={[styles.otpButton, loading && styles.buttonDisabled]}
                    onPress={() => handleVerifyOTP(false)}
                    disabled={loading}
                  >
                    <Text style={styles.otpButtonText}>
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.otpButton,
                      resendDisabled && styles.buttonDisabled,
                    ]}
                    onPress={() => handleGenerateOTP(false)}
                    disabled={resendDisabled}
                  >
                    <Text style={styles.otpButtonText}>
                      {resendDisabled
                        ? `Resend in ${countdown}s`
                        : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.verifyButton, loading && styles.buttonDisabled]}
                onPress={() => handleGenerateOTP(false)}
                disabled={loading}
              >
                <Text style={styles.verifyButtonText}>
                  {loading ? 'Sending OTP...' : 'Verify Email'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.inputContainer}>
          <Lock size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
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

        {!isSignUp && (
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => setResetModalVisible(true)}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        {isSignUp && (
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
                <Text
                  style={[
                    styles.requirementText,
                    { color: req.met ? '#10b981' : '#94a3b8' },
                  ]}
                >
                  {req.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {isSignUp && (
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                ]}
              />
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>I accept the </Text>
              <TouchableOpacity onPress={handleOpenTerms}>
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            (loading || (isSignUp && !otpVerified)) && styles.buttonDisabled,
          ]}
          onPress={handleAuth}
          disabled={loading || (isSignUp && !otpVerified)}
        >
          {isSignUp ? (
            <UserPlus size={20} color="#ffffff" />
          ) : (
            <LogIn size={20} color="#ffffff" />
          )}
          <Text style={styles.buttonText}>
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsSignUp(!isSignUp);
            setPassword('');
            setAcceptedTerms(false);
            setOtpSent(false);
            setOtpVerified(false);
            setOtp('');
          }}
        >
          <Text style={styles.switchButtonText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>

      <ResetPasswordModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    marginTop: 48,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748b',
  },
  checkboxChecked: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  termsText: {
    fontSize: 14,
    color: '#64748b',
  },
  termsLink: {
    fontSize: 14,
    color: '#0891b2',
    textDecorationLine: 'underline',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 14,
    color: '#0891b2',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0891b2',
  },
  verifyButton: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 14,
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
});
