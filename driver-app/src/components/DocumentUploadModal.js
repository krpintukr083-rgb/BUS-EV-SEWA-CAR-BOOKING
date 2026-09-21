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
  const [issueDate, setIssueDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [frontAsset, setFrontAsset] = useState(null);
  const [backAsset, setBackAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const isCitizenship = docType === 'citizenship';
  const isRoutePermit = docType === 'routePermit' || docType === 'route_permit';

  useEffect(() => {
    if (visible) {
      setDocNumber('');
      setExpiryDate('');
      setIssueDate('');
      setDescription('');
      setSelectedAsset(null);
      setFrontAsset(null);
      setBackAsset(null);
      setLoading(false);
    }
  }, [visible, docType]);

  const setTargetAsset = (target, assetObj) => {
    if (target === 'front') {
      setFrontAsset(assetObj);
    } else if (target === 'back') {
      setBackAsset(assetObj);
    } else {
      setSelectedAsset(assetObj);
    }
  };

  const handlePickFromGallery = async (target = 'single') => {
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
        const rawName = asset.fileName || asset.uri.split('/').pop() || `${docType}_${target}_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || (rawName.endsWith('.png') ? 'image/png' : 'image/jpeg');
        setTargetAsset(target, {
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

  const handlePickFromCamera = async (target = 'single') => {
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
        const rawName = asset.fileName || asset.uri.split('/').pop() || `${docType}_${target}_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        setTargetAsset(target, {
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

  const handlePickDocument = async (target = 'single') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset) {
        const rawName = asset.name || asset.uri.split('/').pop() || `${docType}_${target}_${Date.now()}.pdf`;
        const mimeType = asset.mimeType || (rawName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        setTargetAsset(target, {
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
    if (isRoutePermit) {
      if (!description || !description.trim()) {
        Alert.alert('Validation Error', 'Please enter route permit description.');
        return;
      }
      if (description.trim().length > 200) {
        Alert.alert('Validation Error', 'Description must be at most 200 characters.');
        return;
      }
      if (!selectedAsset) {
        Alert.alert('Validation Error', 'Please select or capture a route permit document file/photo.');
        return;
      }
    } else if (isCitizenship) {
      if (!docNumber || docNumber.trim() === '') {
        Alert.alert('Validation Error', 'Please enter the Citizenship Number.');
        return;
      }
      if (!frontAsset) {
        Alert.alert('Validation Error', 'Please select or capture the Front Side of your Citizenship / National ID.');
        return;
      }
    } else {
      if (!docNumber || docNumber.trim() === '') {
        Alert.alert('Validation Error', 'Please enter the document number.');
        return;
      }
      if (!selectedAsset) {
        Alert.alert('Validation Error', 'Please select or capture a document file/photo.');
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('docType', docType);

      if (isRoutePermit) {
        formData.append('description', description.trim());
        formData.append('documentNumber', description.trim());
        formData.append('document', {
          uri: selectedAsset.uri,
          name: selectedAsset.name || `route_permit_${Date.now()}.jpg`,
          type: selectedAsset.mimeType || 'image/jpeg',
        });
      } else if (isCitizenship) {
        formData.append('documentNumber', docNumber.trim());
        if (issueDate.trim()) {
          formData.append('citizenshipIssueDate', issueDate.trim());
          formData.append('issueDate', issueDate.trim());
        }
        formData.append('docFront', {
          uri: frontAsset.uri,
          name: frontAsset.name || `citizenship_front_${Date.now()}.jpg`,
          type: frontAsset.mimeType || 'image/jpeg',
        });
        if (backAsset) {
          formData.append('docBack', {
            uri: backAsset.uri,
            name: backAsset.name || `citizenship_back_${Date.now()}.jpg`,
            type: backAsset.mimeType || 'image/jpeg',
          });
        }
      } else {
        formData.append('documentNumber', docNumber.trim());
        formData.append('expiryDate', expiryDate.trim() || '2029-12-31');
        formData.append('document', {
          uri: selectedAsset.uri,
          name: selectedAsset.name || `${docType}_${Date.now()}.jpg`,
          type: selectedAsset.mimeType || 'image/jpeg',
        });
      }

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

  const renderPickerControls = (target) => {
    let asset = null;
    let removeHandler = null;

    if (target === 'front') {
      asset = frontAsset;
      removeHandler = () => setFrontAsset(null);
    } else if (target === 'back') {
      asset = backAsset;
      removeHandler = () => setBackAsset(null);
    } else {
      asset = selectedAsset;
      removeHandler = () => setSelectedAsset(null);
    }

    if (asset) {
      return (
        <View style={styles.selectedBadge}>
          {asset.isImage && asset.uri ? (
            <Image source={{ uri: asset.uri }} style={styles.previewImage} />
          ) : (
            <Ionicons name="document-text" size={32} color={COLORS.primary} />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.fileNameText} numberOfLines={1}>{asset.name}</Text>
            <Text style={styles.fileSubText}>File selected & attached</Text>
          </View>
          <TouchableOpacity onPress={removeHandler}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger || '#ef4444'} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <TouchableOpacity
          style={styles.uploadAreaContainer}
          onPress={() => handlePickFromGallery(target)}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={28} color={COLORS.primary || '#0A66C2'} />
          <Text style={styles.uploadAreaText}>Tap to upload document</Text>
          <Text style={styles.uploadAreaSubText}>Supported: JPG, PNG, PDF</Text>
        </TouchableOpacity>

        <View style={styles.pickerButtonGroup}>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickFromCamera(target)} activeOpacity={0.8}>
            <Ionicons name="camera" size={18} color={COLORS.primary} />
            <Text style={styles.pickerBtnText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickFromGallery(target)} activeOpacity={0.8}>
            <Ionicons name="images" size={18} color={COLORS.primary} />
            <Text style={styles.pickerBtnText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickDocument(target)} activeOpacity={0.8}>
            <Ionicons name="folder-open" size={18} color={COLORS.primary} />
            <Text style={styles.pickerBtnText}>PDF / File</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isRoutePermit ? 'Upload Route Permit' : `Upload ${docTitle || 'Document'}`}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {isRoutePermit ? (
            <>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="e.g. Route name, permit details, valid for, etc."
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={200}
                multiline={true}
                numberOfLines={3}
              />
              <Text style={styles.charCounter}>{description.length}/200</Text>

              <Text style={styles.label}>Upload Document / Photo *</Text>
              {renderPickerControls('single')}
            </>
          ) : isCitizenship ? (
            <>
              <Text style={styles.label}>Citizenship Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CIT-98765-NP"
                placeholderTextColor={COLORS.textMuted}
                value={docNumber}
                onChangeText={setDocNumber}
              />

              <Text style={styles.label}>Issue Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2025-01-15"
                placeholderTextColor={COLORS.textMuted}
                value={issueDate}
                onChangeText={setIssueDate}
              />

              <Text style={styles.label}>Front Side *</Text>
              {renderPickerControls('front')}

              <Text style={styles.label}>Back Side *</Text>
              {renderPickerControls('back')}
            </>
          ) : (
            <>
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
              {renderPickerControls('single')}
            </>
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
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 11,
    color: COLORS.textMuted || '#94A3B8',
    textAlign: 'right',
    marginTop: -4,
    marginBottom: 6,
  },
  uploadAreaContainer: {
    backgroundColor: 'rgba(10, 102, 194, 0.08)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary || '#0A66C2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  uploadAreaText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary || '#0A66C2',
    marginTop: 6,
  },
  uploadAreaSubText: {
    fontSize: 11,
    color: COLORS.textMuted || '#94A3B8',
    marginTop: 2,
  },
  pickerButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 6,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: 'rgba(10, 102, 194, 0.12)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary || '#0A66C2',
    paddingVertical: 10,
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
    padding: 8,
    marginVertical: 6,
  },
  previewImage: {
    width: 38,
    height: 38,
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
