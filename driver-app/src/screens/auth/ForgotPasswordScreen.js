import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { driverService } from '../../services/driverService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState('phone'); // phone | otp | password
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await driverService.sendPasswordResetOtp(phone);
      if (res.data?.success) {
        setStep('otp');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to send OTP.');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await driverService.verifyPasswordResetOtp(phone, otp);
      if (res.data?.success) {
        setStep('password');
      } else {
        Alert.alert('Error', res.data?.message || 'Invalid OTP.');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await driverService.resetPassword(phone, newPassword);
      if (res.data?.success) {
        Alert.alert('Success', 'Password updated successfully.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to reset password.');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Driver Password Reset</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' && 'Enter your mobile number to receive an OTP.'}
            {step === 'otp' && 'Enter the OTP sent to your mobile number.'}
            {step === 'password' && 'Create a new secure password.'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {step === 'phone' && (
            <>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <Text style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' }}>+977</Text>
                <Text style={{ fontSize: 14, color: COLORS.border, marginHorizontal: 6 }}>|</Text>
                <TextInput
                  style={styles.input}
                  placeholder="98XXXXXXXX"
                  placeholderTextColor={COLORS.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={handleSendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.label}>Enter OTP</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor={COLORS.textMuted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                />
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>Verify OTP</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={handleResetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>Set New Password</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.xl, justifyContent: 'center', minHeight: '100%' },
  backBtn: { marginBottom: SPACING.lg, alignSelf: 'flex-start' },
  header: { marginBottom: SPACING.xxl },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.textPrimary, paddingVertical: 12, fontSize: 14 },
  eyeBtn: { padding: 6 },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' }
});

export default ForgotPasswordScreen;
