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
  Platform, // Import Platform
  ActivityIndicator,
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
  Phone, // Added Phone icon
} from 'lucide-react-native';
import ResetPasswordModal from './item/resetPasswordModal';
import * as Notifications from 'expo-notifications'; // Import expo-notifications
import Constants from 'expo-constants'; // To get project ID

// --- Notification Handler (Keep outside component for clarity) ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // 1. Check if it's a physical device (essential for push)
  const isDevice = Platform.OS !== 'web';
  if (!isDevice) {
    console.log('Not on a physical device, skipping push token retrieval.');
    return null;
  }

  // 2. Setup Android Channel (if needed)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      console.error('Failed to set notification channel:', e);
      // Decide if this is fatal - maybe not, proceed cautiously
    }
  }

  // 3. Check current permission status
  console.log('Checking initial notification permissions...');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  console.log('Initial permission status:', finalStatus);

  // 4. Request permission if not already granted
  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted initially. Requesting...');
    try {
      // Make the first request
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('First permission request result:', finalStatus);
    } catch (e) {
      console.error('Failed to request notification permissions initially:', e);
      Alert.alert(
        'Permission Error',
        'Failed to request notification permissions the first time.',
      );
      return null; // Exit if the request itself fails
    }
  }

  // 5. Handle the final permission status (SHOW ALERT IF STILL NOT GRANTED)
  if (finalStatus !== 'granted') {
    console.log(
      'Permission still not granted after first attempt. Showing custom alert.',
    );
    // Use a Promise to wait for the Alert interaction
    return new Promise<string | null>((resolve) => {
      Alert.alert(
        'Permission Required',
        'Push notifications are currently disabled. Please allow them when prompted to receive important updates.',
        [
          {
            text: 'Allow',
            onPress: async () => {
              console.log(
                'User clicked "Allow" in custom alert. Re-attempting system permission request...',
              );
              try {
                // --- Direct Re-Request Logic ---
                const { status: newStatus } =
                  await Notifications.requestPermissionsAsync();
                console.log('Second permission request status:', newStatus);

                if (newStatus === 'granted') {
                  console.log(
                    'Permission GRANTED on second attempt! Proceeding to get token...',
                  );
                  // Permission granted, now get the token
                  try {
                    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
                    if (!projectId) {
                      const message =
                        "Expo Project ID not found. Ensure 'extra.eas.projectId' is set in your app.json or app.config.js.";
                      console.warn(message);
                      Alert.alert('Configuration Error', message);
                      resolve(null); // Resolve null if config error prevents token fetch
                      return; // Exit onPress handler
                    }

                    console.log(
                      'Requesting Expo Push Token after re-prompt with Project ID:',
                      projectId,
                    );
                    const expoPushToken =
                      await Notifications.getExpoPushTokenAsync({ projectId });
                    token = expoPushToken.data;
                    console.log(
                      'Expo Push Token obtained after re-prompt:',
                      token,
                    );
                    resolve(token); // Resolve the promise with the obtained token
                  } catch (tokenError: any) {
                    console.error(
                      'Failed to get Expo Push Token after re-prompt:',
                      tokenError,
                    );
                    Alert.alert(
                      'Token Error',
                      `Permission granted, but failed to get push token: ${tokenError.message || tokenError}`,
                    );
                    resolve(null); // Resolve null as token fetching failed
                  }
                } else {
                  // Permission still denied even after clicking "Allow" and seeing system prompt (or if prompt was blocked)
                  console.log('Permission still DENIED after second attempt.');
                  Alert.alert(
                    'Notifications Still Disabled',
                    'Permission was not granted by the system. You can enable notifications later in your device settings if needed.',
                  );
                  resolve(null); // Resolve null as permission is definitively denied
                }
              } catch (requestError: any) {
                console.error(
                  'Error during the second permission request attempt:',
                  requestError,
                );
                Alert.alert(
                  'Permission Error',
                  `Failed to request permissions again: ${requestError.message || requestError}`,
                );
                resolve(null); // Resolve null on error during the second request
              }
            },
          },
          {
            text: 'Deny',
            style: 'cancel',
            onPress: () => {
              console.log('User clicked "Deny" in custom alert.');
              Alert.alert(
                'Notifications Disabled',
                'You can enable notifications later in your device settings if you change your mind.',
              );
              resolve(null); // Resolve with null as permission is denied
            },
          },
        ],
        { cancelable: false }, // Prevent dismissing the alert without choosing
      );
    }); // End of Promise wrapper for Alert
  }

  // 6. If permission WAS granted (either initially or after the first request)
  console.log(
    'Notification permission is granted. Proceeding to get token directly.',
  );
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) {
      const message =
        "Expo Project ID not found. Ensure 'extra.eas.projectId' is set in your app.json or app.config.js.";
      console.warn(message);
      Alert.alert('Configuration Error', message);
      return null; // Return null if config error
    }
    console.log(
      'Requesting Expo Push Token (initial grant path) with Project ID:',
      projectId,
    );
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = expoPushToken.data;
    console.log('Expo Push Token obtained (initial grant path):', token);
  } catch (e: any) {
    console.error('Failed to get Expo Push Token (initial grant path):', e);
    Alert.alert('Token Error', `Failed to get push token: ${e.message || e}`);
    return null; // Return null on token retrieval error
  }

  return token; // Return the token (or null if any error occurred)
}

async function savePushToken(userId: string, token: string) {
  if (!userId || !token) {
    console.log('User ID or Token missing, cannot save token.');
    return;
  }

  console.log(
    `Attempting to save/upsert token ${token} (associated with user ${userId}) into push_tokens table.`,
  );
  try {
    // Upsert into push_tokens (public table, just store the token)
    // Consider if you need a unique constraint on the token itself or if duplicates are okay
    // (e.g., if a user uninstalls/reinstalls, they might get the same token).
    // Let's assume a simple upsert is fine for now.
    const { error: upsertError } = await supabase
      .from('push_tokens')
      .upsert({ push_token: token }, { onConflict: 'push_token' }); // Assuming 'push_token' is the primary key or has a unique constraint

    if (upsertError) {
      // Don't throw an error if it's just a conflict (token already exists)
      if (upsertError.code === '23505') {
        // Unique violation
        console.log(
          `Token ${token} already exists in push_tokens. Proceeding to update profile.`,
        );
      } else {
        // Log other unexpected errors during upsert
        console.error(
          `Error upserting push token ${token} into push_tokens:`,
          upsertError,
        );
        // Decide if you want to stop the process here or still try to update the profile
        // For robustness, maybe log the error but continue to profile update
      }
    } else {
      console.log(
        `Successfully upserted/found push token ${token} in push_tokens table.`,
      );
    }

    // Now update the user's profile with this push token
    console.log(`Updating user profile ${userId} with push token ${token}.`);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (updateError) {
      console.error(
        `Error updating push token in profiles table for user ${userId}:`,
        updateError,
      );
      // Consider alerting the user or logging this more prominently if critical
    } else {
      console.log(
        `Successfully updated push token in profiles table for user ${userId}.`,
      );
    }
  } catch (error: any) {
    console.error(
      'Unexpected error during push token saving operations:',
      error,
    );
    // Handle unexpected errors during the entire process
  }
}

// --- Password Requirement Type ---
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
    let timer: NodeJS.Timeout | undefined;
    if (resendDisabled && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown <= 0) {
      setResendDisabled(false);
      setCountdown(30); // Reset countdown
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, countdown]);

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith('@rvu.edu.in');
  };

  // --- OTP Functions (Keep as they are) ---
  const handleGenerateOTP = async () => {
    if (!email || !validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid RVU email address');
      return;
    }
    setLoading(true);
    setResendDisabled(true); // Disable immediately
    setCountdown(30); // Start countdown immediately
    try {
      const response = await fetch(
        'https://otp-service-and-feedback-using-sq-lite.vercel.app/api/otp/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            type: 'numeric',
            organization: 'RVU Lost & Found',
            subject: 'OTP Verification',
          }),
        },
      );
      if (!response.ok) throw new Error('Failed to send OTP');
      setOtpSent(true);
      Alert.alert('Success', 'OTP has been sent to your email');
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
      setResendDisabled(false); // Re-enable on error
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      // Basic OTP format check
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        'https://otp-service-and-feedback-using-sq-lite.vercel.app/api/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp }),
        },
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
  // --- End OTP Functions ---

  // --- Main Auth Handler (Sign Up / Sign In) ---
  const handleAuth = async () => {
    // Basic client-side validation
    if (!email || !password) {
      return Alert.alert('Error', 'Please fill in email and password');
    }
    if (!validateEmail(email)) {
      return Alert.alert('Error', 'Please use your RVU email (@rvu.edu.in)');
    }

    if (isSignUp) {
      if (!fullName.trim()) return Alert.alert('Error', 'Full name required');
      if (!validatePhoneNumber(phoneNumber))
        return Alert.alert('Error', 'Valid 10-digit phone number required');
      if (!otpVerified)
        return Alert.alert('Error', 'Please verify email first');
      const allRequirementsMet = passwordRequirements.every((req) => req.met);
      if (!allRequirementsMet)
        return Alert.alert('Error', 'Password requirements not met');
      if (!acceptedTerms) return Alert.alert('Error', 'Please accept terms');
    }

    setLoading(true);
    let userId: string | undefined = undefined; // To store user ID for token saving

    try {
      if (isSignUp) {
        // 1. Create Auth User
        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
          });
        if (signUpError) throw signUpError;
        if (!authData.user)
          throw new Error('Sign up succeeded but no user data returned.');

        userId = authData.user.id; // Get user ID

        // 2. Create Profile Entry (using upsert for safety)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName.trim(),
          phone_number: phoneNumber,
          updated_at: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
          }),
        });
        if (profileError) throw profileError; // Throw if profile creation fails

        // 3. Register for Push Notifications and Save Token (async, don't block UI)
        registerForPushNotificationsAsync().then((token) => {
          if (token && userId) {
            savePushToken(userId, token);
          }
        });

        // 4. Success feedback and switch to sign-in
        Alert.alert('Success', 'Account created! Please sign in.');
        setIsSignUp(false); // Switch to sign-in view
        // Clear fields for sign-in
        setPassword('');
        setFullName('');
        setPhoneNumber('');
        setOtp('');
        setOtpSent(false);
        setOtpVerified(false);
        setAcceptedTerms(false);
      } else {
        // Sign In Flow
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        if (!signInData.session?.user)
          throw new Error('Sign in succeeded but no session/user data.');

        userId = signInData.session.user.id; // Get user ID

        // 2. Register for Push Notifications and Save Token (async, don't block UI)
        registerForPushNotificationsAsync().then((token) => {
          if (token && userId) {
            savePushToken(userId, token);
          }
        });

        // 3. Navigate to home (handled by _layout.tsx's redirect)
        // router.replace('/'); // This is now redundant due to _layout.tsx logic
        console.log(
          'Sign in successful, navigation will be handled by layout.',
        );
      }
    } catch (error: any) {
      console.log('Auth Error:', error);
      Alert.alert(
        'Authentication Error',
        error.message || 'An unexpected error occurred.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTerms = async () => {
    const url = 'https://svakshaykumar.github.io/LostAndFound-TandC/';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Don't know how to open this URL: ${url}`);
      }
    } catch (error) {
      console.log('Error opening URL:', error);
      Alert.alert('Error', 'Could not open the terms and conditions link.');
    }
  };

  // --- Reset Sign Up State Function ---
  const resetSignUpState = () => {
    setEmail(''); // Keep email maybe? Optional.
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setAcceptedTerms(false);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp('');
    setResendDisabled(false);
    setCountdown(30);
    // Reset password requirements visual state
    setPasswordRequirements((prev) =>
      prev.map((req) => ({ ...req, met: false })),
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Sign up with your RVU email' : 'Sign in to continue'}
        </Text>
      </View>

      <View style={styles.form}>
        {/* --- Sign Up Fields --- */}
        {isSignUp && (
          <>
            <View style={styles.inputContainer}>
              <User size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                textContentType="name" // Hint for autofill
              />
            </View>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number (10 digits)"
                value={phoneNumber}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, '');
                  setPhoneNumber(numericText);
                }}
                keyboardType="numeric"
                maxLength={10}
                textContentType="telephoneNumber" // Hint for autofill
              />
            </View>
          </>
        )}

        {/* --- Email Field --- */}
        <View style={styles.inputContainer}>
          <Mail size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, otpVerified && styles.inputDisabled]} // Visually disable if verified
            placeholder="RVU Email (@rvu.edu.in)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress" // Hint for autofill
            editable={!otpVerified && !loading} // Prevent editing if verified or loading
          />
        </View>

        {/* --- OTP Section (Sign Up Only) --- */}
        {isSignUp && !otpVerified && (
          <View style={styles.otpSection}>
            {!otpSent ? (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.verifyButton,
                  (loading || !validateEmail(email)) && styles.buttonDisabled,
                ]}
                onPress={handleGenerateOTP}
                disabled={loading || !validateEmail(email)}
              >
                <Text style={styles.actionButtonText}>
                  {loading ? 'Sending...' : 'Verify Email'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  {/* Maybe add an icon for OTP */}
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
                <View style={styles.otpActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.otpButton,
                      (loading || otp.length !== 6) && styles.buttonDisabled,
                    ]}
                    onPress={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading && !resendDisabled ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.actionButtonText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.otpButton,
                      (resendDisabled || loading) && styles.buttonDisabled,
                    ]}
                    onPress={handleGenerateOTP} // Re-uses generate function
                    disabled={resendDisabled || loading}
                  >
                    <Text style={styles.actionButtonText}>
                      {resendDisabled ? `Resend (${countdown}s)` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
        {isSignUp && otpVerified && (
          <Text style={styles.verifiedText}>✓ Email Verified</Text>
        )}

        {/* --- Password Field --- */}
        <View style={styles.inputContainer}>
          <Lock size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            disabled={loading}
          >
            {showPassword ? (
              <EyeOff size={20} color="#64748b" />
            ) : (
              <Eye size={20} color="#64748b" />
            )}
          </TouchableOpacity>
        </View>

        {/* --- Forgot Password (Sign In Only) --- */}
        {!isSignUp && (
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => setResetModalVisible(true)}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        {/* --- Password Requirements (Sign Up Only) --- */}
        {isSignUp && (
          <View style={styles.requirements}>
            {/* <Text style={styles.requirementsTitle}>Password must contain:</Text> */}
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
                    { color: req.met ? '#10b981' : '#475569' }, // Adjusted colors
                  ]}
                >
                  {req.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* --- Terms and Conditions (Sign Up Only) --- */}
        {isSignUp && (
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                  loading && styles.checkboxDisabled,
                ]}
              />
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>I accept the </Text>
              <TouchableOpacity onPress={handleOpenTerms} disabled={loading}>
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- Main Auth Button --- */}
        <TouchableOpacity
          style={[
            styles.button,
            // Disable logic: loading OR (is SignUp AND (!otpVerified OR !allPassReqsMet OR !acceptedTerms))
            (loading ||
              (isSignUp &&
                (!otpVerified ||
                  !passwordRequirements.every((req) => req.met) ||
                  !acceptedTerms))) &&
              styles.buttonDisabled,
          ]}
          onPress={handleAuth}
          disabled={
            loading ||
            (isSignUp &&
              (!otpVerified ||
                !passwordRequirements.every((req) => req.met) ||
                !acceptedTerms))
          }
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : isSignUp ? (
            <UserPlus size={20} color="#ffffff" />
          ) : (
            <LogIn size={20} color="#ffffff" />
          )}
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {/* --- Switch between Sign In / Sign Up --- */}
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsSignUp(!isSignUp);
            resetSignUpState(); // Clear relevant fields when switching
          }}
          disabled={loading}
        >
          <Text style={styles.switchButtonText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Reset Password Modal --- */}
      <ResetPasswordModal
        visible={resetModalVisible}
        onClose={() => setResetModalVisible(false)}
      />
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9', // Lighter grey background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', // Center content vertically
    paddingBottom: 40, // Add some padding at the bottom
  },
  header: {
    // marginTop: 48, // Reduced top margin
    paddingTop: 40, // Use padding instead of margin for scroll view
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center', // Center header text
  },
  title: {
    fontSize: 28, // Slightly smaller title
    fontWeight: 'bold', // Bolder
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569', // Slightly darker subtitle
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16, // Keep horizontal margin
    // Removed elevation, using border for subtle separation
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12, // Reduced padding
    borderWidth: 1,
    borderColor: '#e2e8f0', // Subtle border
    height: 52, // Explicit height
  },
  inputIcon: {
    marginRight: 10, // Slightly less margin
  },
  input: {
    flex: 1,
    height: '100%', // Take full height of container
    fontSize: 16,
    color: '#1e293b',
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0', // Grey out background when disabled
    color: '#64748b', // Dim text color
  },
  eyeIcon: {
    padding: 8,
  },
  otpSection: {
    marginBottom: 16, // Add space below OTP section
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8, // Add space above buttons
  },
  actionButton: {
    // Common style for verify/otp buttons
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2', // Primary action color
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButton: {
    // Specific style if needed
    // width: '100%', // Make Verify Email full width initially
  },
  otpButton: {
    flex: 0.48, // Make OTP buttons take up roughly half width each
  },
  verifiedText: {
    color: '#10b981', // Green color for success
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  requirements: {
    marginBottom: 16,
    paddingLeft: 8, // Indent requirements slightly
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
    marginBottom: 6, // Increased spacing
  },
  requirementDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 10,
  },
  requirementText: {
    fontSize: 14,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20, // More space before main button
    marginTop: 4,
  },
  checkboxContainer: {
    padding: 4, // Make it easier to tap
    marginRight: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94a3b8', // Slightly darker border
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
    // Add a checkmark icon inside if desired (using an Icon component)
  },
  checkboxDisabled: {
    backgroundColor: '#e2e8f0',
    borderColor: '#cbd5e1',
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center', // Align text vertically
  },
  termsText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20, // Improve readability
  },
  termsLink: {
    fontSize: 14,
    color: '#0891b2',
    textDecorationLine: 'underline',
    fontWeight: '600', // Make link stand out
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
    minHeight: 52, // Ensure consistent button height
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8', // Use grey for disabled state
    opacity: 0.8, // Slight opacity change
  },
  buttonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  switchButton: {
    marginTop: 24, // More space above switch button
    padding: 8, // Increase tap area
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 14,
    color: '#0891b2',
    fontWeight: '500', // Medium weight
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    paddingVertical: 4, // Increase tap area
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0891b2',
    fontWeight: '500',
  },
});
