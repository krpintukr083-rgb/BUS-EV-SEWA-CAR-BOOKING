import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../state/AuthContext';
import { useLanguage } from '../../state/LanguageContext';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [drivingLicenceNumber, setDrivingLicenceNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [driverPhotoAsset, setDriverPhotoAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickGalleryPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Media library access is required to choose your profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime = asset.mimeType || 'image/jpeg';
        setDriverPhotoAsset({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: mime,
        });
      }
    } catch (err) {
      Alert.alert('Selection Error', err.message || 'Could not pick photo');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take your profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime = asset.mimeType || 'image/jpeg';
        setDriverPhotoAsset({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: mime,
        });
      }
    } catch (err) {
      Alert.alert('Camera Error', err.message || 'Could not take photo');
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password || !drivingLicenceNumber) {
      Alert.alert('Missing Required Fields', 'Full name, mobile number, password, and driving licence number are mandatory.');
      return;
    }

    setLoading(true);
    const photoDataUri = driverPhotoAsset ? `data:${driverPhotoAsset.mimeType};base64,${driverPhotoAsset.base64}` : undefined;

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      password,
      drivingLicenceNumber: drivingLicenceNumber.trim(),
      driverPhoto: photoDataUri,
      email: email ? email.trim() : undefined,
      address: address ? address.trim() : undefined,
      emergencyContact: emergencyPhone ? { name: 'Family Contact', phone: emergencyPhone.trim(), relation: 'Family' } : undefined
    };

    const res = await register(payload);
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Registration Submitted',
        'Your driver account has been created in Pending Verification status. You can upload your KYC documents in your profile.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert('Registration Failed', res.message || 'Could not complete registration.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>{t('register')}</Text>
      <Text style={styles.screenSub}>Join TravelSewa as a verified multi-modal driver partner</Text>

      {/* Notice Pill */}
      <View style={styles.noticePill}>
        <Ionicons name="information-circle" size={18} color={COLORS.primaryLight} />
        <Text style={styles.noticeText}>
          Accounts start in <Text style={{ fontWeight: '800' }}>Pending Verification</Text> until KYC documents are approved.
        </Text>
      </View>

      {/* Driver Photo Upload */}
      <Text style={styles.label}>Driver Profile Photo (Verification Image)</Text>
      {driverPhotoAsset ? (
        <View style={styles.photoPreviewCard}>
          <Image source={{ uri: driverPhotoAsset.uri }} style={styles.previewImage} />
          <View style={styles.photoActionsRow}>
            <TouchableOpacity style={styles.photoActionBtn} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={16} color="#FFF" />
              <Text style={styles.photoActionText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickGalleryPhoto}>
              <Ionicons name="images" size={16} color="#FFF" />
              <Text style={styles.photoActionText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setDriverPhotoAsset(null)}>
              <Ionicons name="trash" size={16} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.photoPickerContainer}>
          <TouchableOpacity style={styles.photoPickerBtn} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={26} color={COLORS.primaryLight} />
            <Text style={styles.photoPickerText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickGalleryPhoto}>
            <Ionicons name="images" size={26} color={COLORS.primaryLight} />
            <Text style={styles.photoPickerText}>Choose Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full Name */}
      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Hari Bahadur"
        placeholderTextColor={COLORS.textMuted}
        value={name}
        onChangeText={setName}
      />

      {/* Mobile Number */}
      <Text style={styles.label}>Mobile Phone Number *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 9841000001"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {/* Driving Licence Number */}
      <Text style={styles.label}>Driving Licence Number *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. DL-01-2024-9982"
        placeholderTextColor={COLORS.textMuted}
        value={drivingLicenceNumber}
        onChangeText={setDrivingLicenceNumber}
      />

      {/* Password */}
      <Text style={styles.label}>Password *</Text>
      <TextInput
        style={styles.input}
        placeholder="Minimum 6 characters"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Email (Optional) */}
      <Text style={styles.label}>Email Address (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. hari.driver@platform.com"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      {/* Address */}
      <Text style={styles.label}>City / Address</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Kalanki, Kathmandu"
        placeholderTextColor={COLORS.textMuted}
        value={address}
        onChangeText={setAddress}
      />

      {/* Emergency Contact */}
      <Text style={styles.label}>Emergency Contact Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 9800000000 (Family Contact)"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="phone-pad"
        value={emergencyPhone}
        onChangeText={setEmergencyPhone}
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Driver Registration</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.huge * 2
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 8
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary
  },
  screenSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: SPACING.md
  },
  noticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10, 102, 194, 0.12)',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 102, 194, 0.3)',
    marginBottom: SPACING.lg
  },
  noticeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1
  },
  photoPickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.md
  },
  photoPickerBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 102, 194, 0.4)',
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    justify: 'center',
    gap: 6
  },
  photoPickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryLight
  },
  photoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    gap: 12
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.primaryLight
  },
  photoActionsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  photoActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  photoActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  removePhotoBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    padding: 8,
    borderRadius: 6
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: SPACING.sm
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.xl
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800'
  }
});

export default RegisterScreen;
