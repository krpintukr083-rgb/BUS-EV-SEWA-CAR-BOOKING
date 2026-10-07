import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const SignUpScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = form, 2 = otp

  const { register, sendRegistrationOtp } = useCustomerAuth();

  const handleSendOtp = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const submittedPhone = `+977${phone.trim()}`;
    const res = await sendRegistrationOtp(submittedPhone);
    setLoading(false);

    if (res.success) {
      setStep(2);
      Alert.alert('OTP Sent', `OTP sent successfully to ${submittedPhone}`);
    } else {
      Alert.alert('Error', res.message || 'Could not send OTP');
    }
  };

  const handleSignUp = async () => {
    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the OTP.');
      return;
    }

    setLoading(true);
    const submittedPhone = `+977${phone.trim()}`;
    const res = await register(name.trim(), email.trim(), submittedPhone, password, otp.trim());
    setLoading(false);

    if (!res.success) {
      Alert.alert('Sign Up Error', res.message || 'Could not create account');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (step === 2) setStep(1);
          else navigation.goBack();
        }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkNavy} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{step === 1 ? 'Create Account' : 'Verify OTP'}</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'Join YatraSewanp.com for instant Bus, EV & Car reservations' : `Enter the 6-digit OTP sent to +977${phone}`}
          </Text>
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Input
                label="Full Name"
                placeholder="e.g. Priya Nair"
                value={name}
                onChangeText={setName}
                icon={<Ionicons name="person-outline" size={18} color="#94a3b8" />}
              />

              <Input
                label="Email Address"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Ionicons name="mail-outline" size={18} color="#94a3b8" />}
              />

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
                    onChangeText={(text) => {
                      let cleaned = text.trim();
                      if (cleaned.startsWith('+977')) cleaned = cleaned.substring(4);
                      else if (cleaned.startsWith('977')) cleaned = cleaned.substring(3);
                      cleaned = cleaned.replace(/[^\d]/g, '');
                      setPhone(cleaned);
                    }}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Input
                label="Create Password"
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon={<Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />}
              />

              <Button
                title="Send OTP"
                onPress={handleSendOtp}
                loading={loading}
                style={{ marginTop: 8 }}
              />
            </>
          ) : (
            <>
              <Input
                label="OTP Code"
                placeholder="6-digit code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                icon={<Ionicons name="keypad-outline" size={18} color="#94a3b8" />}
              />

              <Button
                title="Verify OTP & Register"
                onPress={handleSignUp}
                loading={loading}
                style={{ marginTop: 8 }}
              />
              
              <TouchableOpacity onPress={handleSendOtp} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%'
  },
  backBtn: {
    marginBottom: 16
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4
  },
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
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  loginPrompt: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary
  }
});

export default SignUpScreen;
