import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';

import { COLORS } from '../../constants/colors';

const CustomerProfileScreen = ({ navigation }) => {
  const { customer, logout, refreshUser } = useCustomerAuth();
  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showLoginIdModal, setShowLoginIdModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit Profile state
  const [editName, setEditName] = useState(customer?.name || '');
  const [editEmail, setEditEmail] = useState(customer?.email || '');
  const [editPhone, setEditPhone] = useState(customer?.phone || '');

  // Change Login ID state
  const [newLoginId, setNewLoginId] = useState('');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your TravelSewa account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const handleOpenEditProfile = () => {
    setEditName(customer?.name || '');
    setEditEmail(customer?.email || '');
    setEditPhone(customer?.phone || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      const res = await customerService.updateProfile({
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim()
      });
      if (res.success) {
        Alert.alert('Success', 'Profile updated successfully.');
        await refreshUser();
        setShowEditProfileModal(false);
      } else {
        Alert.alert('Update Failed', res.message || 'Could not update profile');
      }
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoginId = async () => {
    if (!newLoginId.trim()) {
      Alert.alert('Validation Error', 'Please enter new email or mobile number.');
      return;
    }
    setSaving(true);
    try {
      const res = await customerService.changeLoginId(newLoginId.trim());
      if (res.success) {
        Alert.alert('Success', `Login ID changed successfully to ${newLoginId.trim()}.`);
        await refreshUser();
        setShowLoginIdModal(false);
        setNewLoginId('');
      } else {
        Alert.alert('Change Failed', res.message || 'Could not change Login ID');
      }
    } catch (err) {
      Alert.alert('Change Failed', err.response?.data?.message || err.message || 'Failed to change Login ID');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await customerService.changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Change Failed', res.message || 'Could not change password');
      }
    } catch (err) {
      Alert.alert('Change Failed', err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const menuSections = [
    {
      title: 'Account & Security',
      items: [
        {
          id: 'edit-profile',
          title: 'Edit Profile',
          subtitle: 'Update name, email & mobile number',
          icon: 'person-outline',
          action: handleOpenEditProfile
        },
        {
          id: 'change-login-id',
          title: 'Change Login ID',
          subtitle: 'Update account email or phone identifier',
          icon: 'mail-unread-outline',
          action: () => setShowLoginIdModal(true)
        },
        {
          id: 'change-password',
          title: 'Change Password',
          subtitle: 'Update account security password',
          icon: 'key-outline',
          action: () => setShowPasswordModal(true)
        }
      ]
    },
    {
      title: 'Trips & Bookings',
      items: [
        {
          id: 'my-bookings',
          title: 'My Bookings',
          subtitle: 'Active and completed journeys',
          icon: 'ticket-outline',
          action: () => navigation.navigate('MyBookings')
        },
        {
          id: 'booking-history',
          title: 'Booking History',
          subtitle: 'Past tickets and transactions',
          icon: 'time-outline',
          action: () => navigation.navigate('BookingHistory')
        }
      ]
    },

    {
      title: 'Protection & Safety',
      items: [
        {
          id: 'insurance',
          title: 'Insurance Information',
          subtitle: 'Transit accident policy & claims info',
          icon: 'shield-checkmark-outline',
          action: () => navigation.navigate('Insurance')
        },
        {
          id: 'insurance-disclaimer',
          title: 'Insurance Disclaimer',
          subtitle: 'Statutory coverage limits & terms',
          icon: 'information-circle-outline',
          action: () => navigation.navigate('InsuranceDisclaimer')
        }
      ]
    },
    {
      title: 'Help & Policies',
      items: [
        {
          id: 'support',
          title: 'Customer Support',
          subtitle: 'Assistance for transit & reservations',
          icon: 'headset-outline',
          action: () => navigation.navigate('CustomerSupport')
        },
        {
          id: 'terms',
          title: 'Terms & Conditions',
          subtitle: 'Platform user agreement',
          icon: 'document-text-outline',
          action: () => navigation.navigate('Terms')
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          subtitle: 'Data usage & confidentiality',
          icon: 'lock-closed-outline',
          action: () => navigation.navigate('Privacy')
        }
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <Header title="Customer Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: customer?.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
              }}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#ffffff" />
            </View>
          </View>

          <Text style={styles.userName}>{customer?.name || 'Customer Profile'}</Text>
          <Text style={styles.userRole}>Verified Passenger</Text>

          <View style={styles.contactContainer}>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={14} color={COLORS.primary} />
              <Text style={styles.contactText}>{customer?.phone || 'Not set'}</Text>
            </View>
            <View style={styles.contactDot} />
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={14} color={COLORS.primary} />
              <Text style={styles.contactText}>{customer?.email || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.cardMenu}>
              {section.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuRow,
                    iIdx < section.items.length - 1 && styles.menuBorder
                  ]}
                  onPress={item.action}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconBox}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSub}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Log Out of Account</Text>
        </TouchableOpacity>

        {/* Version info */}
        <Text style={styles.versionText}>TravelSewa Customer App v1.0.0 (Production Build)</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. John Doe"
            />

            <Text style={styles.inputLabel}>Mobile Phone</Text>
            <TextInput
              style={styles.modalInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. +919876543210"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="e.g. customer@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.modalBtn} onPress={handleSaveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnText}>Save Profile</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Login ID Modal */}
      <Modal visible={showLoginIdModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Login ID</Text>
              <TouchableOpacity onPress={() => setShowLoginIdModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Current Login ID: {customer?.email || customer?.phone}
            </Text>

            <Text style={styles.inputLabel}>New Email / Phone Number *</Text>
            <TextInput
              style={styles.modalInput}
              value={newLoginId}
              onChangeText={setNewLoginId}
              placeholder="e.g. new_email@example.com or +919876543210"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.modalBtn} onPress={handleSaveLoginId} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnText}>Update Login ID</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password *</Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
            />

            <Text style={styles.inputLabel}>New Password *</Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password (min 6 chars)"
            />

            <Text style={styles.inputLabel}>Confirm New Password *</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm new password"
            />

            <TouchableOpacity style={styles.modalBtn} onPress={handleSavePassword} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnText}>Change Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9'
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.success,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  contactText: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  contactDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8
  },
  sectionWrap: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4
  },
  cardMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  menuTextWrap: {
    flex: 1
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  menuSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700'
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a'
  },
  modalBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18
  },
  modalBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  }
});

export default CustomerProfileScreen;
