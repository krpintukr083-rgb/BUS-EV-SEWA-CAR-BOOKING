import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import Header from '../../components/Header';
import ServerSettingsModal from '../../components/ServerSettingsModal';
import { COLORS } from '../../constants/colors';

const CustomerProfileScreen = ({ navigation }) => {
  const { customer, logout } = useCustomerAuth();
  const [showServerModal, setShowServerModal] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your TravelEase account?',
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

  const menuSections = [
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
      title: 'Connectivity & Server',
      items: [
        {
          id: 'server-settings',
          title: 'Server & Tunnel Settings',
          subtitle: 'Configure HTTPS Tunnel for 4G/5G & WiFi',
          icon: 'git-network-outline',
          action: () => setShowServerModal(true)
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
        },
        {
          id: 'refund-policy',
          title: 'Refund & Cancellation Policy',
          subtitle: 'Deduction terms & refund timelines',
          icon: 'refresh-circle-outline',
          action: () => navigation.navigate('RefundPolicy')
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
                uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
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
              <Text style={styles.contactText}>+91 {customer?.phone || '9876543210'}</Text>
            </View>
            <View style={styles.contactDot} />
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={14} color={COLORS.primary} />
              <Text style={styles.contactText}>{customer?.email || 'customer@example.com'}</Text>
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
        <Text style={styles.versionText}>TravelEase Customer App v1.0.0 (Production Build)</Text>
      </ScrollView>

      {/* Server Settings Modal */}
      <ServerSettingsModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
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
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  userRole: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  contactDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8
  },
  contactText: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  sectionWrap: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4
  },
  cardMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
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
    borderBottomColor: '#f1f5f9'
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  menuTextWrap: {
    flex: 1
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  menuSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginTop: 8,
    marginBottom: 16
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textSecondary
  }
});

export default CustomerProfileScreen;
