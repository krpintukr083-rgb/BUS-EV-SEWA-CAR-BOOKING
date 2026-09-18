import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../state/AuthContext';
import { useLanguage } from '../../state/LanguageContext';
import {
  getEffectiveBaseUrl,
  setCustomServerUrl,
  resetServerUrl,
  testServerConnection
} from '../../services/api';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Server Settings Modal State
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [currentBaseUrl, setCurrentBaseUrl] = useState('');
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadEffectiveUrl();
  }, []);

  const loadEffectiveUrl = async () => {
    try {
      const url = await getEffectiveBaseUrl();
      setCurrentBaseUrl(url);
      setCustomInputUrl(url);
    } catch (e) {
      // ignore
    }
  };

  const handleTestConnection = async (targetUrl = null) => {
    setTestingConnection(true);
    setTestStatus(null);
    try {
      const result = await testServerConnection(targetUrl || customInputUrl || currentBaseUrl);
      setTestStatus(result);
    } catch (err) {
      setTestStatus({ success: false, error: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveCustomServer = async () => {
    if (!customInputUrl.trim()) {
      Alert.alert('Empty URL', 'Please enter a valid server URL or click Reset to Default.');
      return;
    }
    await setCustomServerUrl(customInputUrl.trim());
    await loadEffectiveUrl();
    Alert.alert('Server Saved', 'Driver Backend API URL updated successfully.');
    setServerModalVisible(false);
  };

  const handleResetServer = async () => {
    await resetServerUrl();
    await loadEffectiveUrl();
    setTestStatus(null);
    Alert.alert('Reset Complete', 'Backend API URL reset to default Render cloud server.');
    setServerModalVisible(false);
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Validation Error', 'Please enter your mobile phone number or email, and password.');
      return;
    }

    setLoading(true);
    const res = await login(identifier.trim(), password);
    setLoading(false);

    if (!res.success) {
      Alert.alert(
        'Login Failed',
        res.message || 'Invalid credentials. Please verify your login details.',
        [
          { text: 'OK' },
          {
            text: 'Server Settings',
            onPress: () => {
              setServerModalVisible(true);
              handleTestConnection();
            }
          }
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Banner */}
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="car-sport" size={40} color="#FFF" />
          </View>
          <Text style={styles.brandTitle}>TravelEase Driver</Text>
          <Text style={styles.brandSub}>Official Driver & Conductor Platform</Text>
        </View>

        {/* Login Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t('login')}</Text>

          {/* Identifier Input */}
          <Text style={styles.label}>{t('phone')} / Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. +919876543210 or driver@platform.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your secure password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>{t('login')}</Text>
            )}
          </TouchableOpacity>

          {/* Server Connection Pill */}
          <TouchableOpacity
            style={styles.serverPill}
            onPress={() => {
              setServerModalVisible(true);
              handleTestConnection();
            }}
          >
            <Ionicons name="server-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.serverPillText} numberOfLines={1}>
              Server: {currentBaseUrl || 'Live Cloud (Render)'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>New driver partner? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{t('register')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Backend Server Settings Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="server" size={20} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Backend Server Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Driver App connects to high-availability cloud backend. You can also specify an emulator or local IP.
            </Text>

            <Text style={styles.fieldLabel}>Active Server URL</Text>
            <TextInput
              style={styles.modalInput}
              value={customInputUrl}
              onChangeText={setCustomInputUrl}
              placeholder="https://bus-ev-sewa-car-booking.onrender.com/api"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {testStatus && (
              <View
                style={[
                  styles.statusCard,
                  testStatus.success ? styles.statusCardSuccess : styles.statusCardError
                ]}
              >
                <Ionicons
                  name={testStatus.success ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={testStatus.success ? '#16a34a' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.statusCardText,
                    { color: testStatus.success ? '#15803d' : '#b91c1c' }
                  ]}
                >
                  {testStatus.success
                    ? `Connected! Status ${testStatus.status} OK (${testStatus.latency}ms)`
                    : `Connection Failed: ${testStatus.error}`}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={16} color="#ffffff" />
                  <Text style={styles.testBtnText}>Test Server Connection</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetServer}>
                <Text style={styles.resetBtnText}>Reset to Default</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomServer}>
                <Text style={styles.saveBtnText}>Save URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5
  },
  brandSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6
  },
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
  inputIcon: {
    marginRight: SPACING.sm
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingVertical: 12,
    fontSize: 14
  },
  eyeBtn: {
    padding: 6
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800'
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  serverPillText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
    marginHorizontal: 8,
    fontWeight: '500'
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl
  },
  registerPrompt: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryLight
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a'
  },
  modalSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 12
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  statusCardSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  statusCardError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  statusCardText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  testBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  resetBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  }
});

export default LoginScreen;
