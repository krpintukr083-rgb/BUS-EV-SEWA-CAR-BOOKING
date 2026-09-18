import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { driverService } from '../services/driverService';

const DocumentUploadModal = ({ visible, docType, docTitle, onClose, onSuccess }) => {
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!docNumber) {
      Alert.alert('Validation Error', 'Please enter the document number.');
      return;
    }

    setLoading(true);
    try {
      const sampleUrl = docUrl || `https://storage.travelease.com/docs/${docType}_${Date.now()}.jpg`;
      const res = await driverService.uploadDocument({
        docType,
        documentNumber: docNumber,
        docUrl: sampleUrl,
        expiryDate: expiryDate || '2029-12-31'
      });

      if (res.data?.success) {
        Alert.alert('Success', `${docTitle} submitted for review and set to Pending verification.`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e) {
      Alert.alert('Upload Failed', e.response?.data?.message || 'Could not upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload {docTitle}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Document Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. DL-01-2024-9982"
            placeholderTextColor={COLORS.textMuted}
            value={docNumber}
            onChangeText={setDocNumber}
          />

          <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2029-12-31"
            placeholderTextColor={COLORS.textMuted}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />

          <View style={styles.uploadPlaceholder}>
            <Ionicons name="cloud-upload" size={36} color={COLORS.primary} />
            <Text style={styles.uploadText}>Document Photo / Scan Attached</Text>
            <Text style={styles.uploadSub}>Clear front & back image will be uploaded</Text>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleUpload}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Document for KYC</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md
  },
  uploadPlaceholder: {
    backgroundColor: 'rgba(10, 102, 194, 0.1)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: SPACING.sm
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 6
  },
  uploadSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  }
});

export default DocumentUploadModal;
