import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../state/AuthContext';
import { useLanguage } from '../../state/LanguageContext';
import { driverService } from '../../services/driverService';
import { checkAndNotifyBookingRequests } from '../../services/notificationService';
import DriverHeader from '../../components/DriverHeader';

const DashboardScreen = ({ navigation }) => {
  const { user, driver, isOnline, toggleOnlineStatus } = useAuth();
  const { t } = useLanguage();

  const [dashboardData, setDashboardData] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const isPendingVerification = ['Pending Verification', 'Pending', 'Rejected'].includes(driver?.driverStatus);

  const handleToggleOnline = async () => {
    if (isPendingVerification && !isOnline) {
      Alert.alert(
        'Account Pending Verification',
        'Your driver account is currently Pending Admin Verification. Once Admin approves your KYC documents, you will be able to go online and accept ride requests.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open KYC Documents', onPress: () => navigation.navigate('DriverKYC') }
        ]
      );
      return;
    }
    toggleOnlineStatus(!isOnline);
  };

  const loadDashboard = async () => {
    try {
      const [dashRes, reqRes] = await Promise.all([
        driverService.getDashboard().catch(() => ({ data: { data: null } })),
        driverService.getBookingRequests().catch(() => ({ data: { data: [] } }))
      ]);

      if (dashRes.data?.data) {
        setDashboardData(dashRes.data.data);
      }
      if (reqRes.data?.data) {
        setIncomingRequests(reqRes.data.data);
        checkAndNotifyBookingRequests(reqRes.data.data, user?._id || driver?._id);
      }
    } catch (e) {
      console.warn('Dashboard load error', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      const interval = setInterval(loadDashboard, 10000);
      return () => clearInterval(interval);
    }, [isOnline])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const activeTrip = dashboardData?.activeRide;
  const isEV = driver?.assignedType === 'ev' || dashboardData?.assignedVehicle?.vehicleType === 'EV-Sewa';
  const todayEarnings = dashboardData?.paymentAggregate?.todayDriverNet || driver?.walletBalance || 0;
  const completedCount = dashboardData?.completedTripsCount || 0;

  return (
    <View style={styles.container}>
      <DriverHeader navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Pending Verification Alert Banner */}
        {isPendingVerification && (
          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 1,
            borderColor: '#f59e0b',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="alert-circle" size={24} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#f59e0b' }}>
                  {driver?.driverStatus === 'Rejected' ? 'KYC Document Rejected' : 'Account Pending Verification'}
                </Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {driver?.driverStatus === 'Rejected'
                    ? (driver?.rejectionReason ? `Reason: ${driver.rejectionReason}` : 'One or more documents were rejected by Admin. Please re-upload.')
                    : 'Documents Submitted — Pending Admin Verification. Upload required KYC documents to activate ride acceptance.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#f59e0b',
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
                marginTop: 12
              }}
              onPress={() => navigation.navigate('DriverKYC')}
            >
              <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 13 }}>
                Open KYC / Upload Documents
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Online / Offline Status Card */}
        <View style={[styles.statusBanner, { borderColor: isOnline ? 'rgba(16, 185, 129, 0.4)' : COLORS.border }]}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusPillLarge, { backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : COLORS.surfaceLight }]}>
              <View style={[styles.statusDotLarge, { backgroundColor: isOnline ? COLORS.online : COLORS.offline }]} />
              <Text style={[styles.statusTextLarge, { color: isOnline ? COLORS.online : COLORS.textMuted }]}>
                {isOnline ? t('online') : t('offline')}
              </Text>
            </View>
            <Text style={styles.statusSub}>
              {isOnline ? t('readyForRides') : t('switchOnline')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: isOnline ? COLORS.surfaceLight : COLORS.primary }]}
            onPress={handleToggleOnline}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, { color: isOnline ? COLORS.textPrimary : '#FFF' }]}>
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Trip Banner (if any) */}
        {activeTrip && (
          <TouchableOpacity
            style={styles.activeTripCard}
            onPress={() => navigation.navigate('ActiveRide', { bookingId: activeTrip._id || activeTrip.bookingId })}
            activeOpacity={0.8}
          >
            <View style={styles.activeTripHeader}>
              <View style={styles.liveBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveText}>TRIP IN PROGRESS</Text>
              </View>
              <Text style={styles.activeBookingId}>#{activeTrip.bookingId}</Text>
            </View>
            <Text style={styles.activeCustomerName}>{activeTrip.customer?.name || 'Passenger'}</Text>
            <Text style={styles.activeRoute} numberOfLines={1}>
              {activeTrip.pickupLocation} → {activeTrip.dropLocation}
            </Text>
            <View style={styles.resumeRow}>
              <Text style={styles.resumeText}>Tap to Open Active Ride Screen</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primaryLight} />
            </View>
          </TouchableOpacity>
        )}

        {/* Incoming Requests Banner */}
        {isOnline && incomingRequests.length > 0 && (
          <TouchableOpacity
            style={styles.requestsAlertBanner}
            onPress={() => navigation.navigate('Requests')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications" size={20} color="#FBBF24" />
            <Text style={styles.requestsAlertText}>
              {incomingRequests.length} New Booking Request{incomingRequests.length > 1 ? 's' : ''} Available!
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* KPI Summary Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t('todayEarnings')}</Text>
            <Text style={styles.kpiValue}>₹{todayEarnings}</Text>
            <Text style={styles.kpiSub}>Net 80% credited</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t('completedTrips')}</Text>
            <Text style={styles.kpiValue}>{completedCount}</Text>
            <Text style={styles.kpiSub}>Lifetime Completed</Text>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t('walletBalance')}</Text>
            <Text style={[styles.kpiValue, { color: COLORS.online }]}>₹{driver?.walletBalance || 0}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.kpiLink}>Withdraw →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Customer Rating</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="star" size={18} color="#FBBF24" />
              <Text style={[styles.kpiValue, { marginTop: 0 }]}>{driver?.rating?.average?.toFixed(1) || '4.9'}</Text>
            </View>
            <Text style={styles.kpiSub}>Based on ratings</Text>
          </View>
        </View>

        {/* EV Hub Quick Preview (EV Only) */}
        {isEV && (
          <TouchableOpacity
            style={styles.evCard}
            onPress={() => navigation.navigate('EVHub')}
            activeOpacity={0.8}
          >
            <View style={styles.evHeader}>
              <View style={styles.evHeaderLeft}>
                <Ionicons name="flash" size={20} color={COLORS.evGreen} />
                <Text style={styles.evTitle}>EV Hub & Range Estimator</Text>
              </View>
              <Text style={styles.evBatteryBadge}>{driver?.batteryPercentage || 85}%</Text>
            </View>
            <Text style={styles.evRangeText}>
              Estimated Range: <Text style={{ fontWeight: '800', color: COLORS.textPrimary }}>{driver?.estimatedRangeKm || 265} km</Text>
            </Text>
            <Text style={styles.evSub}>View nearby fast charging stations & update battery</Text>
          </TouchableOpacity>
        )}

        {/* Assigned Vehicle Quick Card */}
        <TouchableOpacity
          style={styles.vehicleCard}
          onPress={() => navigation.navigate('VehicleDetails')}
          activeOpacity={0.8}
        >
          <Ionicons name="car" size={22} color={COLORS.primary} />
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleTitle}>
              {dashboardData?.assignedVehicle?.vehicleName || driver?.assignedVehicle?.vehicleName || 'Assigned Vehicle'}
            </Text>
            <Text style={styles.vehicleSub}>
              {dashboardData?.assignedVehicle?.vehicleNumber || driver?.assignedVehicle?.vehicleNumber || 'Vehicle #'} • {dashboardData?.assignedVehicle?.vehicleType || 'Transport'}
            </Text>
            <Text style={styles.vehicleRoute}>
              {dashboardData?.assignedVehicle?.route?.origin || driver?.assignedVehicle?.route?.origin || 'Route not assigned'}
              {(dashboardData?.assignedVehicle?.route?.origin || driver?.assignedVehicle?.route?.origin) &&
                (dashboardData?.assignedVehicle?.route?.destination || driver?.assignedVehicle?.route?.destination)
                ? ' → '
                : ''}
              {dashboardData?.assignedVehicle?.route?.destination || driver?.assignedVehicle?.route?.destination || ''}
            </Text>
            <Text style={styles.vehicleStatus}>
              Driver: {dashboardData?.driver?.name || driver?.name || 'Driver'} • Status: {dashboardData?.assignedVehicle?.vehicleStatus || driver?.assignedVehicle?.vehicleStatus || 'Inactive'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Quick Menu Actions Grid */}
        <Text style={styles.sectionHeader}>Quick Operations</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Requests')}>
            <Ionicons name="list" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>{t('newRideRequests')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('BusConfirmation')}>
            <Ionicons name="bus" size={24} color={COLORS.warning} />
            <Text style={styles.menuItemText}>Bus Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DriverKYC')}>
            <Ionicons name="document-text" size={24} color={COLORS.accent} />
            <Text style={styles.menuItemText}>KYC Docs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Earnings')}>
            <Ionicons name="stats-chart" size={24} color={COLORS.online} />
            <Text style={styles.menuItemText}>Earnings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.huge * 2
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: SPACING.md
  },
  statusLeft: {
    flex: 1
  },
  statusPillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6
  },
  statusDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '800'
  },
  statusSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '800'
  },
  activeTripCard: {
    backgroundColor: 'rgba(10, 102, 194, 0.15)',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md
  },
  activeTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryLight
  },
  activeBookingId: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  activeCustomerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  activeRoute: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm
  },
  resumeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryLight
  },
  requestsAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryDark,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md
  },
  requestsAlertText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 4
  },
  kpiSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  kpiLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginTop: 4
  },
  evCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 14,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: SPACING.md
  },
  evHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  evHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  evTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  evBatteryBadge: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.evGreen
  },
  evRangeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  evSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    gap: 12
  },
  vehicleInfo: {
    flex: 1
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  vehicleSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  vehicleRoute: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 5
  },
  vehicleStatus: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md
  },
  menuItem: {
    width: '47%',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  }
});

export default DashboardScreen;
