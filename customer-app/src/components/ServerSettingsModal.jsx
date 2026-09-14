import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import {
  getEffectiveBaseUrl,
  getCustomServerUrl,
  setCustomServerUrl,
  resetServerUrl,
  testServerConnection,
  BACKEND_TUNNEL_URL,
  BACKEND_LAN_URL
} from '../services/api';

const ServerSettingsModal = ({ visible, onClose, onSaved }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    const effective = await getEffectiveBaseUrl();
    const saved = await getCustomServerUrl();
    setCurrentUrl(effective);
    setInputUrl(saved || '');
    setTestResult(null);
  };

  const handleTestConnection = async (urlToTest = null) => {
    const target = urlToTest !== null ? urlToTest : (inputUrl.trim() || currentUrl);
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testServerConnection(target || undefined);
      setTestResult(res);
    } catch (e) {
      setTestResult({
        success: false,
        error: e.message || 'Connection failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const trimmed = inputUrl.trim();
    await setCustomServerUrl(trimmed);
    const newEffective = await getEffectiveBaseUrl();
    setCurrentUrl(newEffective);
    Alert.alert('Server Updated', 'Backend server URL has been saved and activated.', [
      {
        text: 'OK',
        onPress: () => {
          if (onSaved) onSaved(newEffective);
          onClose();
        }
      }
    ]);
  };

  const handleReset = async () => {
    await resetServerUrl();
    const newEffective = await getEffectiveBaseUrl();
    setInputUrl('');
    setCurrentUrl(newEffective);
    setTestResult(null);
    Alert.alert('Reset Complete', 'Server URL reverted to default settings.');
    if (onSaved) onSaved(newEffective);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="git-network-outline" size={24} color={COLORS.primary} />
              <Text style={styles.title}>Server & Tunnel Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Active URL Status Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Currently Active API Endpoint:</Text>
              <Text style={styles.activeUrlText} numberOfLines={2}>
                {currentUrl || 'Resolving...'}
              </Text>
              <View style={styles.tagRow}>
                {currentUrl.includes('https://') ? (
                  <View style={[styles.badge, styles.badgeSuccess]}>
                    <Ionicons name="shield-checkmark" size={14} color="#15803d" />
                    <Text style={styles.badgeSuccessText}>HTTPS Secure Tunnel</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgeWarning]}>
                    <Ionicons name="wifi" size={14} color="#b45309" />
                    <Text style={styles.badgeWarningText}>Local LAN (Same Wi-Fi)</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Input URL Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Custom Tunnel or Server URL:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. https://xxx.lhr.life or ngrok"
                placeholderTextColor="#999"
                value={inputUrl}
                onChangeText={setInputUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                Leave blank to use default configured tunnel/LAN.
              </Text>
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={18} color="#fff" />
                  <Text style={styles.testBtnText}>Test Connection (Ping)</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Test Result Feedback */}
            {testResult && (
              <View
                style={[
                  styles.resultCard,
                  testResult.success ? styles.resultSuccess : styles.resultError
                ]}
              >
                <Ionicons
                  name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={testResult.success ? '#15803d' : '#b91c1c'}
                />
                <View style={styles.resultTextContainer}>
                  <Text
                    style={[
                      styles.resultTitle,
                      { color: testResult.success ? '#15803d' : '#b91c1c' }
                    ]}
                  >
                    {testResult.success ? 'Connected Successfully!' : 'Connection Failed'}
                  </Text>
                  <Text style={styles.resultDesc}>
                    {testResult.success
                      ? `Latency: ${testResult.latency}ms • Status: Online`
                      : testResult.error || 'Server is not reachable'}
                  </Text>
                </View>
              </View>
            )}

            {/* Quick Tips */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>💡 Connection Guide:</Text>
              <Text style={styles.infoItem}>
                • <Text style={styles.bold}>Mobile Data (4G/5G):</Text> Use the HTTPS tunnel URL generated by running <Text style={styles.bold}>npm run tunnel</Text> on PC.
              </Text>
              <Text style={styles.infoItem}>
                • <Text style={styles.bold}>Wi-Fi Network:</Text> Works with either the HTTPS tunnel or LAN IP (when on the same router).
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnReset]}
                onPress={handleReset}
              >
                <Text style={styles.btnResetText}>Reset Default</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={handleSave}
              >
                <Text style={styles.btnSaveText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  closeBtn: {
    padding: 4
  },
  card: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4
  },
  activeUrlText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7'
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d'
  },
  badgeWarning: {
    backgroundColor: '#fef3c7'
  },
  badgeWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309'
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a'
  },
  helperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4
  },
  testBtn: {
    backgroundColor: COLORS.primary || '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14
  },
  testBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 14
  },
  resultSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  resultError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  resultTextContainer: {
    flex: 1
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  resultDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4
  },
  infoItem: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    lineHeight: 16
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnReset: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  btnResetText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14
  },
  btnSave: {
    backgroundColor: '#16a34a'
  },
  btnSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  }
});

export default ServerSettingsModal;
