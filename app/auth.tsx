import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
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
} from 'lucide-react-native';
import ResetPasswordModal from './item/resetPasswordModal';

type PasswordRequirement = {
  label: string;
  regex: RegExp;
  met: boolean;
};
const validatePhoneNumber = (phone: string) => {
  return /^\d{10}$/.test(phone); // Ensures it's exactly 10 digits
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
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();

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

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith('@rvu.edu.in');
  };

  const handleGenerateOTP = async () => {
    if (!email || !validateEmail(email)) {
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
            email,
            type: 'numeric',
            organization: 'RVU Lost & Found',
            subject: 'OTP Verification',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send OTP');

      setOtpSent(true);
      setResendDisabled(true);
      Alert.alert('Success', 'OTP has been sent to your email');
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
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
            email,
            otp,
          }),
        }
      );

      if (!response.ok) throw new Error('Invalid OTP');

      setOtpVerified(true);
      Alert.alert('Success', 'Email verified successfully');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
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

      if (!validatePhoneNumber(phoneNumber)) {
        Alert.alert('Error', 'Please enter a valid 10-digit phone number');
        return;
      }

      if (!otpVerified) {
        Alert.alert('Error', 'Please verify your email first');
        return;
      }

      const allRequirementsMet = passwordRequirements.every(req => req.met);
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
        // First create the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        // Then update the profile with additional information
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user!.id,
            email: email,
            full_name: fullName,
            phone_number: phoneNumber,
          });

        if (profileError) throw profileError;

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
      const url = 'https:///github.com/svakshaykumar';
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
        {isSignUp && (
          <View style={styles.inputContainer}>
            <User size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (10 digits)"
              value={phoneNumber}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, ''); // Restrict input to only numbers
                setPhoneNumber(numericText);
              }}
              keyboardType="numeric"
              maxLength={10}
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
                    onPress={() => handleVerifyOTP()}
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
                    onPress={() => handleGenerateOTP()}
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
                onPress={() => handleGenerateOTP()}
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

      <ResetPasswordModal
        visible={resetModalVisible}
        onClose={() => setResetModalVisible(false)}
      />
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
});
