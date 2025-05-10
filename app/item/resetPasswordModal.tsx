import React, { useState, useEffect } from 'react'; // Added useEffect
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator, // Added ActivityIndicator
  ScrollView, // Added ScrollView
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, X, CheckCircle } from 'lucide-react-native'; // Added CheckCircle
import { supabase } from '@/lib/supabase';

// --- Password Requirement Type (Keep as is) ---
type PasswordRequirement = {
  label: string;
  regex: RegExp;
  met: boolean;
};

// --- Password Requirements Array (Keep as is) ---
const passwordRequirementsInitial: PasswordRequirement[] = [
  { label: '8-16 characters', regex: /^.{8,16}$/, met: false },
  { label: 'At least one number', regex: /\d/, met: false },
  {
    label: 'At least one special character',
    regex: /[!@#$%^&*(),.?":{}|<>]/,
    met: false,
  },
];

// --- Modal Props (Keep as is) ---
type ResetPasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function ResetPasswordModal({
  visible,
  onClose,
}: ResetPasswordModalProps) {
  // --- State Variables (Keep mostly as is) ---
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetResendDisabled, setResetResendDisabled] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(30);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Added for confirm field
  const [loading, setLoading] = useState(false);
  const [currentPasswordRequirements, setCurrentPasswordRequirements] =
    useState<PasswordRequirement[]>(
      passwordRequirementsInitial.map((req) => ({ ...req, met: false })), // Initialize met state
    );
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // For specific error messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // For success messages

  // --- Reset State Function (Keep as is, maybe add error/success message reset) ---
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
    setShowConfirmPassword(false);
    setLoading(false); // Ensure loading is reset
    setCurrentPasswordRequirements(
      passwordRequirementsInitial.map((req) => ({ ...req, met: false })),
    );
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // --- Handle Close (Keep as is) ---
  const handleClose = () => {
    if (!loading) {
      // Prevent closing while loading
      onClose();
      resetPasswordStates(); // Reset state when closing
    }
  };

  // --- Validate Email (Keep as is) ---
  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith('@rvu.edu.in');
  };

  // --- Countdown Timer Effect ---
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (resetResendDisabled && resetCountdown > 0) {
      timer = setInterval(() => {
        setResetCountdown((prev) => prev - 1);
      }, 1000);
    } else if (resetCountdown <= 0) {
      setResetResendDisabled(false);
      setResetCountdown(30); // Reset countdown
      clearInterval(timer);
    }
    return () => clearInterval(timer); // Cleanup timer on unmount or dependency change
  }, [resetResendDisabled, resetCountdown]);

  // --- Password Requirements Check Effect ---
  useEffect(() => {
    if (resetOtpVerified) {
      // Only check when in the password entry phase
      const updatedRequirements = currentPasswordRequirements.map((req) => ({
        ...req,
        met: req.regex.test(newPassword),
      }));
      setCurrentPasswordRequirements(updatedRequirements);
    }
  }, [newPassword, resetOtpVerified]); // Re-run when newPassword or step changes

  // --- Generate OTP (Keep as is, add error/success state updates) ---
  const handleGenerateOTP = async () => {
    setErrorMessage(null); // Clear previous errors
    setSuccessMessage(null);
    if (!resetEmail || !validateEmail(resetEmail)) {
      setErrorMessage('Please enter a valid RVU email address (@rvu.edu.in)');
      return;
    }

    setLoading(true);
    setResetResendDisabled(true); // Disable immediately
    setResetCountdown(30); // Start countdown immediately

    try {
      const response = await fetch(
        'https://otp-service-and-feedback-using-sq-lite.vercel.app/api/otp/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resetEmail,
            type: 'numeric',
            organization: 'RVU Lost & Found - Password Reset', // Be specific
            subject: 'Password Reset OTP Verification',
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to get error details
        console.log('OTP Generation Error:', errorData);
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      setResetOtpSent(true);
      setSuccessMessage('OTP has been sent to your email.'); // Use success state
      // Alert.alert('Success', 'OTP has been sent to your email'); // Can remove Alert
    } catch (error: any) {
      console.log('Error sending OTP:', error);
      setErrorMessage(error.message || 'Failed to send OTP. Please try again.'); // Use error state
      // Alert.alert('Error', 'Failed to send OTP. Please try again.'); // Can remove Alert
      setResetResendDisabled(false); // Re-enable button on error
      setResetCountdown(30); // Reset timer state
    } finally {
      setLoading(false);
    }
  };

  // --- Verify OTP (Keep as is, add error/success state updates) ---
  const handleVerifyOTP = async () => {
    setErrorMessage(null); // Clear previous errors
    setSuccessMessage(null);
    if (!resetOtp || resetOtp.length !== 6) {
      // Basic OTP format check
      setErrorMessage('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://otp-service-and-feedback-using-sq-lite.vercel.app/api/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail, otp: resetOtp }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to get error details
        console.log('OTP Verification Error:', errorData);
        throw new Error(errorData.message || 'Invalid or expired OTP');
      }

      setResetOtpVerified(true);
      setSuccessMessage(
        'Email verified successfully. Please enter your new password.',
      ); // Use success state
      // Alert.alert('Success', 'Email verified successfully'); // Can remove Alert
    } catch (error: any) {
      console.log('Error verifying OTP:', error);
      setErrorMessage(error.message || 'Invalid OTP. Please try again.'); // Use error state
      // Alert.alert('Error', 'Invalid OTP. Please try again.'); // Can remove Alert
    } finally {
      setLoading(false);
    }
  };

  // --- Reset Password (Ensure parameter order matches definition) ---
  const handleResetPassword = async () => {
    // ... (previous checks remain the same) ...

    setLoading(true);
    try {
      // 1. Get User ID (remains the same)
      const { data: userId, error: rpcError } = await supabase.rpc(
        'get_user_id_by_email',
        { user_email: resetEmail },
      );

      if (rpcError) {
        console.log('RPC Error getting user ID:', rpcError);
        throw new Error('An error occurred while verifying user information.');
      }
      if (!userId) {
        console.warn('User ID not found for email:', resetEmail);
        throw new Error('Could not find user associated with this email.'); // Keep this specific error
      }

      // 2. Call update password function - *Ensure object order matches function definition*
      const { data: updateSuccessful, error: updateError } = await supabase.rpc(
        'update_password_by_user_id',
        {
          // Match definition: target_user_id uuid, new_password text
          target_user_id: userId, // First argument in definition
          new_password: newPassword, // Second argument in definition
        },
      );

      if (updateError) {
        console.log('RPC Error updating password:', updateError);
        // Log the raw error to see the details again if needed
        console.log('Raw Update Error:', JSON.stringify(updateError));
        // Use the message from the error object if available
        throw new Error(
          updateError.message || 'Failed to update password via RPC.',
        );
      }

      if (updateSuccessful === true) {
        setSuccessMessage('Password updated successfully!');
        try {
          const { error } = await supabase.auth.signOut({ scope: 'global' });

          if (error) {
            throw error;
          }
          Alert.alert(
            'Password Changed Successfully',
            'You have been signed out from all the devices. Please log in again on this device to continue.',
            [{ text: 'OK' }],
          );
        } catch (error) {
          Alert.alert('Error', 'Failed to sign out of all device');
        }
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        console.warn(
          'Update password function returned false for user:',
          userId,
        );
        // This likely means the user ID became invalid between check and update, or internal error
        throw new Error(
          'Failed to update password. Please try again or contact support.',
        );
      }
    } catch (error: any) {
      console.log('Error during password reset process:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // --- Render Logic ---
  return (
    <Modal
      animationType="fade" // Changed animation
      transparent={true}
      visible={visible}
      onRequestClose={handleClose} // Use defined handler
    >
      <View style={styles.modalOverlay}>
        {/* Use ScrollView to prevent content overflow */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                disabled={loading}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Error and Success Message Display */}
            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}
            {successMessage && !resetOtpVerified && (
              <Text style={styles.successText}>{successMessage}</Text>
            )}

            {/* --- Step 1 & 2: Email and OTP --- */}
            {!resetOtpVerified ? (
              <>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, resetOtpSent && styles.inputDisabled]} // Disable visually if OTP sent
                    placeholder="RVU Email (@rvu.edu.in)"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!resetOtpSent && !loading} // Disable editing if OTP sent or loading
                  />
                </View>

                {resetOtpSent ? (
                  <>
                    <View style={styles.inputContainer}>
                      {/* Add OTP icon? Maybe KeyRound */}
                      <TextInput
                        style={[styles.input, loading && styles.inputDisabled]}
                        placeholder="Enter 6-digit OTP"
                        value={resetOtp}
                        onChangeText={setResetOtp}
                        keyboardType="numeric"
                        maxLength={6}
                        editable={!loading}
                      />
                    </View>
                    <View style={styles.otpActions}>
                      <TouchableOpacity
                        style={[
                          styles.otpButton,
                          (loading || resetOtp.length !== 6) &&
                            styles.buttonDisabled,
                        ]}
                        onPress={handleVerifyOTP}
                        disabled={loading || resetOtp.length !== 6}
                      >
                        {loading && !resetResendDisabled ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.otpButtonText}>Verify OTP</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.otpButton,
                          (resetResendDisabled || loading) &&
                            styles.buttonDisabled,
                        ]}
                        onPress={handleGenerateOTP}
                        disabled={resetResendDisabled || loading}
                      >
                        <Text style={styles.otpButtonText}>
                          {resetResendDisabled
                            ? `Resend (${resetCountdown}s)`
                            : 'Resend OTP'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      (loading || !validateEmail(resetEmail)) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleGenerateOTP}
                    disabled={loading || !validateEmail(resetEmail)}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              /* --- Step 3: New Password --- */
              <>
                {/* Show final success/error messages here too */}
                {successMessage && (
                  <Text style={styles.successText}>{successMessage}</Text>
                )}
                {errorMessage && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                )}

                {/* Display confirmation of verification */}
                <View style={styles.verifiedContainer}>
                  <CheckCircle size={18} color="#10b981" />
                  <Text style={styles.verifiedText}> Email Verified</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Lock size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
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

                <View style={styles.inputContainer}>
                  <Lock size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword} // Use separate state
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)} // Use separate state handler
                    style={styles.eyeIcon}
                    disabled={loading}
                  >
                    {showConfirmPassword ? ( // Use separate state
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Password Requirements */}
                <View style={styles.requirements}>
                  {/* <Text style={styles.requirementsTitle}>Requirements:</Text> */}
                  {currentPasswordRequirements.map((req, index) => (
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
                          { color: req.met ? '#10b981' : '#475569' },
                        ]}
                      >
                        {req.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Final Update Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    (loading ||
                      !newPassword ||
                      newPassword !== confirmPassword ||
                      !currentPasswordRequirements.every((req) => req.met)) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={
                    loading ||
                    !newPassword ||
                    newPassword !== confirmPassword ||
                    !currentPasswordRequirements.every((req) => req.met)
                  }
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// --- Styles (Adjusted and cleaned up slightly) ---
const styles = StyleSheet.create({
  modalOverlay: {
    width: '100%', // Take full width within padding
    height: '100%', // Take full height within padding
    maxWidth: 500, // Max width for larger screens
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
    borderRadius: 16,
    padding: 24,
    // Removed fixed elevation/shadow for potentially better performance, border is subtle
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center', // Center content vertically
    alignContent: 'center', // Center content horizontally
    // marginTop: 400, // Margin around modal
  },
  scrollContainer: {
    flexGrow: 1, // Allow scrolling if content exceeds height
    justifyContent: 'center', // Center content vertically in scrollview
    width: '100%', // Ensure scroll content takes width
  },
  modalContent: {
    // width: '100%', // Take full width within padding
    maxWidth: 500, // Max width for larger screens
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    // Removed fixed elevation/shadow for potentially better performance, border is subtle
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20, // Slightly less margin
  },
  modalTitle: {
    fontSize: 22, // Slightly smaller title
    fontWeight: 'bold', // Bolder
    color: '#1e293b',
  },
  closeButton: {
    padding: 8, // Increase tap area
    borderRadius: 16, // Make it round
    // backgroundColor: '#f1f5f9', // Optional subtle background
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12, // Adjusted padding
    borderWidth: 1,
    borderColor: '#e2e8f0', // Subtle border
    height: 52, // Explicit height
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1e293b',
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0', // Grey out background when disabled
    color: '#64748b', // Dim text color
  },
  eyeIcon: {
    padding: 8, // Tap area for eye
  },
  requirements: {
    marginBottom: 20, // More space below reqs
    paddingLeft: 4,
  },
  requirementsTitle: {
    // Kept if needed, but commented out in JSX
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 10,
  },
  requirementText: {
    fontSize: 14,
    // Color set dynamically
  },
  button: {
    flexDirection: 'row', // Allow icon + text if needed later
    justifyContent: 'center', // Center content
    alignItems: 'center',
    backgroundColor: '#0891b2', // Primary color
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 52, // Consistent height
    marginTop: 8, // Space above button
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8', // Greyed out color
    opacity: 0.7, // Slightly transparent
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16, // Space below OTP buttons
  },
  otpButton: {
    backgroundColor: '#0891b2',
    borderRadius: 10, // Slightly less rounded than main button
    paddingVertical: 14,
    paddingHorizontal: 12,
    flex: 0.48, // Take slightly less than half width
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  otpButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626', // Red-600
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  successText: {
    color: '#059669', // Green-600
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    // backgroundColor: '#ecfdf5', // Optional light green background
    // borderRadius: 8,
  },
  verifiedText: {
    color: '#10b981', // Green color for success text
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
});
