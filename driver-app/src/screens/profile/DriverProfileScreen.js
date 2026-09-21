import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../state/AuthContext';
import { useLanguage } from '../../state/LanguageContext';
import LanguageModal from '../../components/LanguageModal';
import { driverService } from '../../services/driverService';

export default function DriverProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { driver, logout, fetchFreshProfile } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Profile Edit State
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Change Login ID State
  const [loginIdModalVisible, setLoginIdModalVisible] = useState(false);
  const [newLoginId, setNewLoginId] = useState('');
  const [loginType, setLoginType] = useState('phone');
  const [updatingLoginId, setUpdatingLoginId] = useState(false);

  // Change Password State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleOpenEditProfile = () => {
    setEditName(driver?.name || '');
    setEditPhone(driver?.phone || driver?.mobileNumber || '');
    setEditEmail(driver?.email || driver?.user?.email || '');
    setEditAddress(driver?.address || '');
    setEditEmergencyContact(driver?.emergencyContact || driver?.emergencyPhone || '');
    setEditProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }
    setUpdatingProfile(true);
    try {
      const res = await driverService.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        emergencyContact: editEmergencyContact.trim(),
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setEditProfileModalVisible(false);
        if (fetchFreshProfile) fetchFreshProfile();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to update profile.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleOpenChangeLoginId = () => {
    setNewLoginId(driver?.phone || driver?.email || '');
    setLoginType(driver?.email && !driver?.phone ? 'email' : 'phone');
    setLoginIdModalVisible(true);
  };

  const handleSaveLoginId = async () => {
    if (!newLoginId.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid Login ID.');
      return;
    }
    setUpdatingLoginId(true);
    try {
      const res = await driverService.changeLoginId(newLoginId.trim(), loginType);
      if (res.data?.success) {
        Alert.alert('Success', res.data?.message || 'Login ID changed successfully!');
        setLoginIdModalVisible(false);
        if (fetchFreshProfile) fetchFreshProfile();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to change Login ID.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to change Login ID.');
    } finally {
      setUpdatingLoginId(false);
    }
  };

  const handleOpenChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Current Password is required.');
      return;
    }
    if (!newPassword) {
      Alert.alert('Validation Error', 'New Password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Confirm Password must match New Password.');
      return;
    }
    setUpdatingPassword(true);
    try {
      const res = await driverService.changePassword(currentPassword, newPassword, confirmPassword);
      if (res.data?.success) {
        Alert.alert('Success', res.data?.message || 'Password changed successfully!');
        setPasswordModalVisible(false);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to change password.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdatePhoto = async () => {
    try {
      Alert.alert(
        'Update Profile Photo',
        'Choose an option to update your profile photo:',
        [
          {
            text: 'Take Photo (Camera)',
            onPress: async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Permission Required', 'Camera permission is required.');
                return;
              }
              const res = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true
              });
              if (!res.canceled && res.assets?.[0]) {
                uploadPhoto(res.assets[0]);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Permission Required', 'Gallery permission is required.');
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true
              });
              if (!res.canceled && res.assets?.[0]) {
                uploadPhoto(res.assets[0]);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not launch photo picker');
    }
  };

  const uploadPhoto = async (asset) => {
    setPhotoUploading(true);
    try {
      const mime = asset.mimeType || 'image/jpeg';
      const base64Uri = `data:${mime};base64,${asset.base64}`;
      const res = await driverService.updateProfile({ profilePhoto: base64Uri });
      if (res.data?.success) {
        Alert.alert('Success', 'Profile photo updated successfully!');
        if (fetchFreshProfile) fetchFreshProfile();
      } else {
        Alert.alert('Update Failed', res.data?.message || 'Could not update photo.');
      }
    } catch (err) {
      Alert.alert('Update Error', err.response?.data?.message || err.message || 'Failed to update photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const getLanguageLabel = () => {
    if (currentLanguage === 'ne') return 'नेपाली (Nepali)';
    if (currentLanguage === 'hi') return 'हिन्दी (Hindi)';
    return 'English';
  };

  const photoUrl = driver?.profilePhoto || driver?.driverPhoto || driver?.user?.profilePhoto;

  const menuSections = [
    {
      title: 'Account & Security',
      items: [
        {
          icon: 'account-edit-outline',
          title: 'Edit Profile',
          sub: 'Update name, phone, email, address, emergency contact',
          onPress: handleOpenEditProfile,
        },
        {
          icon: 'card-account-details-outline',
          title: 'Change Login ID',
          sub: 'Update registered phone number or email',
          onPress: handleOpenChangeLoginId,
        },
        {
          icon: 'lock-reset',
          title: 'Change Password',
          sub: 'Update account password safely',
          onPress: handleOpenChangePassword,
        },
      ],
    },
    {
      title: 'Vehicle & Documents',
      items: [
        {
          icon: 'bus',
          title: t('vehicleDetails'),
          sub: 'Specs, seating & assigned routes',
          screen: 'VehicleDetails',
        },
        {
          icon: 'file-certificate',
          title: t('kycDocuments'),
          sub: 'License, citizenship, RC & insurance',
          screen: 'DriverKYC',
        },
        {
          icon: 'ev-station',
          title: t('evHub'),
          sub: 'Battery %, range & charging stations',
          screen: 'EVHub',
        },
      ],
    },
    {
      title: 'Trips & Financials',
      items: [
        {
          icon: 'history',
          title: t('rideHistory'),
          sub: 'Past completed & cancelled trips',
          screen: 'RideHistory',
        },
        {
          icon: 'chart-line',
          title: t('earningsSummary'),
          sub: '20% commission & net earnings',
          screen: 'Earnings',
        },
        {
          icon: 'wallet',
          title: t('driverWallet'),
          sub: 'Balance & payout requests',
          screen: 'Wallet',
        },
      ],
    },
    {
      title: 'Safety & Preferences',
      items: [
        {
          icon: 'shield-alert-outline',
          title: t('safetyCenter'),
          sub: 'Emergency contacts & direct helplines',
          screen: 'Safety',
        },
        {
          icon: 'translate',
          title: t('language'),
          sub: getLanguageLabel(),
          onPress: () => setLangModalVisible(true),
        },
        {
          icon: 'headset',
          title: t('driverSupport'),
          sub: 'FAQs, ticket submission & helpline',
          screen: 'Support',
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={{ width: 30, height: 30, borderRadius: 8, marginRight: 8 }} resizeMode="contain" />
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handleUpdatePhoto} activeOpacity={0.8}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(driver?.name || 'Driver').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              {photoUploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <MaterialCommunityIcons name="camera" size={14} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.driverName}>{driver?.name || 'Partner Driver'}</Text>
          <Text style={styles.driverPhone}>{driver?.phone || driver?.mobileNumber || '+977-98XXXXXXXX'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color={COLORS.success} />
              <Text style={styles.statusBadgeText}>{driver?.status || 'VERIFIED'}</Text>
            </View>
            <View style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>{driver?.serviceType || 'BUS / CAB'}</Text>
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <View style={styles.ratingRow}>
                <MaterialCommunityIcons name="star" size={16} color={COLORS.warning} />
                <Text style={styles.metricVal}>{driver?.rating?.toFixed(1) || '4.9'}</Text>
              </View>
              <Text style={styles.metricLabel}>{t('rating')}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>97%</Text>
              <Text style={styles.metricLabel}>Acceptance</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>{driver?.totalTrips || '142'}</Text>
              <Text style={styles.metricLabel}>{t('completedTrips')}</Text>
            </View>
          </View>
        </View>

        {/* Menu Navigation Sections */}
        {menuSections.map((sec, secIdx) => (
          <View key={secIdx} style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>{sec.title}</Text>
            <View style={styles.menuCard}>
              {sec.items.map((item, itemIdx) => (
                <TouchableOpacity
                  key={itemIdx}
                  style={[
                    styles.menuItem,
                    itemIdx < sec.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => {
                    if (item.onPress) {
                      item.onPress();
                    } else if (item.screen) {
                      navigation.navigate(item.screen);
                    }
                  }}
                >
                  <View style={styles.menuIconBox}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={COLORS.primary} />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSub}>{item.sub}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
          <Text style={styles.logoutBtnText}>{t('logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>TravelEase Driver Partner App v2.4.0</Text>
      </ScrollView>

      {/* Language Switch Modal */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />

      {/* Edit Profile Modal */}
      <Modal visible={editProfileModalVisible} animationType="slide" transparent>
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle}>Edit Driver Profile</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              <Text style={modalStyles.fieldLabel}>Name</Text>
              <TextInput
                style={modalStyles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor="#999"
              />
              <Text style={modalStyles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={modalStyles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone Number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <Text style={modalStyles.fieldLabel}>Email Address</Text>
              <TextInput
                style={modalStyles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email Address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={modalStyles.fieldLabel}>Address</Text>
              <TextInput
                style={modalStyles.input}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Address"
                placeholderTextColor="#999"
              />
              <Text style={modalStyles.fieldLabel}>Emergency Contact</Text>
              <TextInput
                style={modalStyles.input}
                value={editEmergencyContact}
                onChangeText={setEditEmergencyContact}
                placeholder="Emergency Contact Phone"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </ScrollView>
            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setEditProfileModalVisible(false)}>
                <Text style={modalStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSaveProfile} disabled={updatingProfile}>
                {updatingProfile ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={modalStyles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Login ID Modal */}
      <Modal visible={loginIdModalVisible} animationType="slide" transparent>
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle}>Change Login ID</Text>
            <Text style={modalStyles.modalSub}>
              Update your primary login identifier. Your existing driver account, earnings, and KYC data will remain safe.
            </Text>
            <View style={modalStyles.typeRow}>
              <TouchableOpacity
                style={[modalStyles.typeBtn, loginType === 'phone' && modalStyles.typeBtnActive]}
                onPress={() => setLoginType('phone')}
              >
                <Text style={[modalStyles.typeBtnText, loginType === 'phone' && modalStyles.typeBtnTextActive]}>Phone</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.typeBtn, loginType === 'email' && modalStyles.typeBtnActive]}
                onPress={() => setLoginType('email')}
              >
                <Text style={[modalStyles.typeBtnText, loginType === 'email' && modalStyles.typeBtnTextActive]}>Email</Text>
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.fieldLabel}>New Login ID ({loginType === 'email' ? 'Email' : 'Phone'})</Text>
            <TextInput
              style={modalStyles.input}
              value={newLoginId}
              onChangeText={setNewLoginId}
              placeholder={loginType === 'email' ? 'driver@example.com' : '98XXXXXXXX'}
              placeholderTextColor="#999"
              keyboardType={loginType === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
            />
            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setLoginIdModalVisible(false)}>
                <Text style={modalStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSaveLoginId} disabled={updatingLoginId}>
                {updatingLoginId ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={modalStyles.saveBtnText}>Update ID</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle}>Change Password</Text>
            <Text style={modalStyles.fieldLabel}>Current Password *</Text>
            <TextInput
              style={modalStyles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor="#999"
              secureTextEntry
            />
            <Text style={modalStyles.fieldLabel}>New Password *</Text>
            <TextInput
              style={modalStyles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor="#999"
              secureTextEntry
            />
            <Text style={modalStyles.fieldLabel}>Confirm New Password *</Text>
            <TextInput
              style={modalStyles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor="#999"
              secureTextEntry
            />
            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setPasswordModalVisible(false)}>
                <Text style={modalStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSavePassword} disabled={updatingPassword}>
                {updatingPassword ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={modalStyles.saveBtnText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: COLORS.bgCard || '#1E1E1E',
    borderRadius: RADIUS.l,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.border || '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary || '#FFF',
    marginBottom: SPACING.xs,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textSecondary || '#AAA',
    marginBottom: SPACING.m,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary || '#AAA',
    marginTop: SPACING.s,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.bgDark || '#121212',
    color: COLORS.textPrimary || '#FFF',
    borderRadius: RADIUS.m,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border || '#333',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.s,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.bgDark || '#121212',
    borderWidth: 1,
    borderColor: COLORS.border || '#333',
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary || '#007AFF',
    borderColor: COLORS.primary || '#007AFF',
  },
  typeBtnText: {
    color: COLORS.textSecondary || '#AAA',
    fontSize: 13,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFF',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: SPACING.l,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.m,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    color: COLORS.textMuted || '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.primary || '#007AFF',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  profileCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.l,
    ...SHADOWS.card,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.s,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgCard,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  driverPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.s,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.s,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
  },
  serviceBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.s,
  },
  serviceBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    paddingVertical: SPACING.m,
    marginTop: SPACING.m,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: SPACING.m,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.s,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  menuTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuItemSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
    paddingVertical: 14,
    borderRadius: RADIUS.m,
    gap: 8,
    marginTop: SPACING.s,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.l,
  },
});
