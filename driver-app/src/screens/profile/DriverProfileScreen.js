import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../state/AuthContext';
import { useLanguage } from '../../state/LanguageContext';
import LanguageModal from '../../components/LanguageModal';

export default function DriverProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { driver, logout } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

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

  const menuSections = [
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
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(driver?.name || 'Driver').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.driverName}>{driver?.name || 'Partner Driver'}</Text>
          <Text style={styles.driverPhone}>{driver?.phone || '+977-98XXXXXXXX'}</Text>

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
    </View>
  );
}

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
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.s,
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
