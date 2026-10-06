import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import { customerService } from '../../services/customerService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState('phone'); // phone | otp | password
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await customerService.sendPasswordResetOtp(phone);
      if (res.success) {
        setStep('otp');
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP.');
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
      const res = await customerService.verifyPasswordResetOtp(phone, otp);
      if (res.success) {
        setStep('password');
      } else {
        Alert.alert('Error', res.message || 'Invalid OTP.');
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
      const res = await customerService.resetPassword(phone, newPassword);
      if (res.success) {
        Alert.alert('Success', 'Password updated successfully.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to reset password.');
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
          <Ionicons name="arrow-back" size={24} color={COLORS.darkNavy} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' && 'Enter your mobile number to receive an OTP.'}
            {step === 'otp' && 'Enter the OTP sent to your mobile number.'}
            {step === 'password' && 'Create a new secure password.'}
          </Text>
        </View>

        <View style={styles.card}>
          {step === 'phone' && (
            <>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 }}>Mobile Number</Text>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                    <Ionicons name="call-outline" size={18} color="#94a3b8" />
                  </View>
                  <View style={{ position: 'absolute', left: 40, zIndex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' }}>+977</Text>
                    <Text style={{ fontSize: 15, color: '#cbd5e1', marginHorizontal: 6 }}>|</Text>
                  </View>
                  <TextInput
                    style={{
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 15,
                      color: COLORS.textPrimary,
                      paddingLeft: 96
                    }}
                    placeholder="98XXXXXXXX"
                    placeholderTextColor="#94a3b8"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <Button title="Send OTP" onPress={handleSendOtp} loading={loading} />
            </>
          )}

          {step === 'otp' && (
            <>
              <Input
                label="Enter OTP"
                placeholder="6-digit code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                icon={<Ionicons name="keypad-outline" size={18} color="#94a3b8" />}
              />
              <Button title="Verify OTP" onPress={handleVerifyOtp} loading={loading} />
            </>
          )}

          {step === 'password' && (
            <>
              <Input
                label="New Password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                icon={<Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />}
              />
              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                icon={<Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />}
              />
              <Button title="Set New Password" onPress={handleResetPassword} loading={loading} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  backBtn: { marginBottom: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.darkNavy },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4
  }
});

export default ForgotPasswordScreen;
