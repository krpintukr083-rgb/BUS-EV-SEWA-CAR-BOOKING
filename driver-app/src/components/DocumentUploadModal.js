import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SPACING } from '../constants/theme';
import { driverService } from '../services/driverService';

const DocumentUploadModal = ({ visible, docType, docTitle, onClose, onSuccess }) => {
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setDocNumber('');
      setExpiryDate('');
      setSelectedAsset(null);
      setLoading(false);
    }
  }, [visible]);

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Media library permission is required to select document photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset) {
        const rawName = asset.fileName || asset.uri.split('/').pop() || `${docType}_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || (rawName.endsWith('.png') ? 'image/png' : 'image/jpeg');
        setSelectedAsset({
          uri: asset.uri,
          name: rawName,
          mimeType: mimeType,
          isImage: true,
        });
      }
    } catch (err) {
      Alert.alert('Selection Error', err.message || 'Could not pick photo');
    }
  };

  const handlePickFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take a document photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset) {
        const rawName = asset.fileName || asset.uri.split('/').pop() || `${docType}_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        setSelectedAsset({
          uri: asset.uri,
          name: rawName,
          mimeType: mimeType,
          isImage: true,
        });
      }
    } catch (err) {
      Alert.alert('Camera Error', err.message || 'Could not capture photo');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset) {
        const rawName = asset.name || asset.uri.split('/').pop() || `${docType}_${Date.now()}.pdf`;
        const mimeType = asset.mimeType || (rawName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        setSelectedAsset({
          uri: asset.uri,
          name: rawName,
          mimeType: mimeType,
          isImage: mimeType ? mimeType.startsWith('image/') : !rawName.endsWith('.pdf'),
        });
      }
    } catch (err) {
      Alert.alert('Document Error', err.message || 'Could not pick document');
    }
  };

  const handleUpload = async () => {
    if (!docNumber || docNumber.trim() === '') {
      Alert.alert('Validation Error', 'Please enter the document number.');
      return;
    }

    if (!selectedAsset) {
      Alert.alert('Validation Error', 'Please select or capture a document file/photo.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', {
        uri: selectedAsset.uri,
        name: selectedAsset.name || `${docType}_${Date.now()}.jpg`,
        type: selectedAsset.mimeType || 'image/jpeg',
      });
      formData.append('docType', docType);
      formData.append('documentNumber', docNumber.trim());
      formData.append('expiryDate', expiryDate.trim() || '2029-12-31');

      const res = await driverService.uploadDocument(formData);

      if (res.data?.success || res.success) {
        Alert.alert('Success', `${docTitle || 'Document'} submitted for review and set to Pending verification.`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        Alert.alert('Upload Failed', res.data?.message || res.message || 'Could not upload document');
      }
    } catch (e) {
      console.log('Upload error:', e?.response?.data || e.message);
      Alert.alert('Upload Failed', e.response?.data?.message || e.message || 'Could not upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload {docTitle || 'Document'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Document / License Number *</Text>
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

          <Text style={styles.label}>Select Document File / Photo *</Text>
          
          {selectedAsset ? (
            <View style={styles.selectedBadge}>
              {selectedAsset.isImage && selectedAsset.uri ? (
                <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} />
              ) : (
                <Ionicons name="document-text" size={32} color={COLORS.primary} />
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fileNameText} numberOfLines={1}>{selectedAsset.name}</Text>
                <Text style={styles.fileSubText}>File selected & attached</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedAsset(null)}>
                <Ionicons name="trash-outline" size={20} color={COLORS.danger || '#ef4444'} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerButtonGroup}>
              <TouchableOpacity style={styles.pickerBtn} onPress={handlePickFromCamera} activeOpacity={0.8}>
                <Ionicons name="camera" size={22} color={COLORS.primary} />
                <Text style={styles.pickerBtnText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerBtn} onPress={handlePickFromGallery} activeOpacity={0.8}>
                <Ionicons name="images" size={22} color={COLORS.primary} />
                <Text style={styles.pickerBtnText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerBtn} onPress={handlePickDocument} activeOpacity={0.8}>
                <Ionicons name="folder-open" size={22} color={COLORS.primary} />
                <Text style={styles.pickerBtnText}>PDF / File</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
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
    padding: SPACING.lg || 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface || COLORS.bgCard || '#1E293B',
    borderRadius: 20,
    padding: SPACING.xl || 20,
    borderWidth: 1,
    borderColor: COLORS.border || '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg || 16,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary || '#F8FAFC',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary || '#94A3B8',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: COLORS.surfaceLight || '#0F172A',
    borderRadius: 10,
    paddingHorizontal: SPACING.md || 12,
    paddingVertical: 10,
    color: COLORS.textPrimary || '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border || '#334155',
    marginBottom: SPACING.xs || 6,
  },
  pickerButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: 'rgba(10, 102, 194, 0.12)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary || '#0A66C2',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary || '#F8FAFC',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 102, 194, 0.15)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary || '#0A66C2',
    padding: 10,
    marginVertical: 10,
  },
  previewImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  fileNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary || '#F8FAFC',
  },
  fileSubText: {
    fontSize: 11,
    color: COLORS.success || '#10B981',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: COLORS.primary || '#0A66C2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default DocumentUploadModal;
