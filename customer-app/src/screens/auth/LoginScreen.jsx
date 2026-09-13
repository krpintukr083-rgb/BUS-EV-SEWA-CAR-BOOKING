import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const LoginScreen = ({ navigation }) => {
  const [authMode, setAuthMode] = useState('email'); // 'phone' | 'email'
  const [identifier, setIdentifier] = useState('priya.nair@example.com');
  const [password, setPassword] = useState('user123');
  const [loading, setLoading] = useState(false);

  const { login } = useCustomerAuth();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your mobile/email and password.');
      return;
    }

    setLoading(true);
    const res = await login(identifier.trim(), password);
    setLoading(false);

    if (!res.success) {
      Alert.alert('Login Failed', res.message || 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Logo & Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="bus" size={38} color={COLORS.primary} />
          </View>
          <Text style={styles.brandTitle}>TravelEase</Text>
          <Text style={styles.brandSubtitle}>Bus • EV-Sewa • Car Booking Platform</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.instructionText}>Sign in to your customer account to manage journeys</Text>

          {/* Switch Mode Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => {
                setAuthMode('phone');
                setIdentifier('+919844556677');
              }}
              style={[styles.tab, authMode === 'phone' && styles.activeTab]}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={authMode === 'phone' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, authMode === 'phone' && styles.activeTabText]}>Mobile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAuthMode('email');
                setIdentifier('priya.nair@example.com');
              }}
              style={[styles.tab, authMode === 'email' && styles.activeTab]}
            >
              <Ionicons
                name="mail-outline"
                size={16}
                color={authMode === 'email' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, authMode === 'email' && styles.activeTabText]}>Email</Text>
            </TouchableOpacity>
          </View>

          <Input
            label={authMode === 'phone' ? 'Mobile Number' : 'Email Address'}
            placeholder={authMode === 'phone' ? '+919876543210' : 'name@example.com'}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType={authMode === 'phone' ? 'phone-pad' : 'email-address'}
            autoCapitalize="none"
            icon={<Ionicons name={authMode === 'phone' ? 'call-outline' : 'mail-outline'} size={18} color="#94a3b8" />}
          />

          <Input
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />}
          />

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          {/* Quick Demo Credentials helper */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo Customer Credentials:</Text>
            <Text style={styles.demoText}>Email: priya.nair@example.com | Pass: user123</Text>
            <Text style={styles.demoText}>Mobile: +919844556677 | Pass: user123</Text>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 20
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5
  },
  brandSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500'
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
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 4
  },
  instructionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  demoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2
  },
  demoText: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  signupPrompt: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary
  }
});

export default LoginScreen;
