import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import {
  getEffectiveBaseUrl,
  setCustomServerUrl,
  resetServerUrl,
  testServerConnection,
  BACKEND_TUNNEL_URL
} from '../../services/api';

const LoginScreen = ({ navigation }) => {
  const [authMode, setAuthMode] = useState('email'); // 'phone' | 'email'
  const [identifier, setIdentifier] = useState('priya.nair@example.com');
  const [password, setPassword] = useState('user123');
  const [loading, setLoading] = useState(false);

  // Server settings modal state
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [serverTestStatus, setServerTestStatus] = useState(null); // { success, latency, error }
  const [testingServer, setTestingServer] = useState(false);

  const { login } = useCustomerAuth();

  useEffect(() => {
    loadServerInfo();
  }, []);

  const loadServerInfo = async () => {
    try {
      const url = await getEffectiveBaseUrl();
      setCurrentServerUrl(url);
      setCustomInputUrl(url);
    } catch (e) {}
  };

  const handleTestConnection = async (targetUrl = null) => {
    setTestingServer(true);
    setServerTestStatus(null);
    try {
      const res = await testServerConnection(targetUrl || customInputUrl || currentServerUrl);
      setServerTestStatus(res);
    } catch (err) {
      setServerTestStatus({ success: false, error: err.message });
    } finally {
      setTestingServer(false);
    }
  };

  const handleSaveCustomServer = async () => {
    if (!customInputUrl.trim()) {
      Alert.alert('Empty URL', 'Please enter a valid server URL or click Reset to Default.');
      return;
    }
    await setCustomServerUrl(customInputUrl.trim());
    await loadServerInfo();
    Alert.alert('Server Saved', 'Backend API URL updated successfully.');
    setServerModalVisible(false);
  };

  const handleResetServer = async () => {
    await resetServerUrl();
    await loadServerInfo();
    setServerTestStatus(null);
    Alert.alert('Reset to Live Cloud', 'Backend API URL reset to default Render cloud server.');
    setServerModalVisible(false);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your mobile/email and password.');
      return;
    }

    setLoading(true);
    const res = await login(identifier.trim(), password);
    setLoading(false);

    if (!res.success) {
      Alert.alert(
        'Login Failed',
        res.message || 'Invalid credentials',
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

          {/* Server status pill button */}
          <TouchableOpacity
            style={styles.serverPill}
            onPress={() => {
              setServerModalVisible(true);
              handleTestConnection();
            }}
          >
            <Ionicons name="server-outline" size={14} color="#64748b" />
            <Text style={styles.serverPillText} numberOfLines={1}>
              Server: {currentServerUrl || 'Live Cloud (Render)'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Server Settings Modal */}
      <Modal
        visible={serverModalVisible}
        transparent={true}
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
              TravelEase uses high-speed cloud servers. You can also connect to a custom server IP.
            </Text>

            <Text style={styles.fieldLabel}>Active Server URL</Text>
            <TextInput
              style={styles.modalInput}
              value={customInputUrl}
              onChangeText={setCustomInputUrl}
              placeholder="https://your-backend.onrender.com/api"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Test Status Banner */}
            {serverTestStatus && (
              <View
                style={[
                  styles.statusCard,
                  serverTestStatus.success ? styles.statusCardSuccess : styles.statusCardError
                ]}
              >
                <Ionicons
                  name={serverTestStatus.success ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={serverTestStatus.success ? '#16a34a' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.statusCardText,
                    { color: serverTestStatus.success ? '#15803d' : '#b91c1c' }
                  ]}
                >
                  {serverTestStatus.success
                    ? `Connected! Status 200 OK (${serverTestStatus.latency}ms)`
                    : `Connection Failed: ${serverTestStatus.error}`}
                </Text>
              </View>
            )}

            {/* Test connection button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={testingServer}
            >
              {testingServer ? (
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
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  serverPillText: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    marginHorizontal: 6,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
    color: COLORS.darkNavy
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkNavy,
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
