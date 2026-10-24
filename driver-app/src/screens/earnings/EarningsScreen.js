import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';

export default function EarningsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [period, setPeriod] = useState('TODAY'); // 'TODAY', 'WEEKLY', 'MONTHLY'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const activeRequestRef = useRef(0);
  const [earningsData, setEarningsData] = useState({
    grossFare: 0,
    commission: 0,
    platformCharge: 0,
    netEarnings: 0,
    netDriverEarning: 0,
    paidSettlement: 0,
    pendingSettlement: 0,
    completedTrips: 0,
    hoursOnline: 0,
    cashCollected: 0,
    history: []
  });

  useEffect(() => {
    setLoading(true);
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    const requestId = ++activeRequestRef.current;
    try {
      setError(null);
      const currentPeriodParam = period.toLowerCase();
      const [rawEarningsRes, rawHistoryRes] = await Promise.all([
        driverService.getEarnings(currentPeriodParam),
        driverService.getBookingHistory ? driverService.getBookingHistory() : driverService.getHistory()
      ]);

      // Guard against stale response if user rapidly switched tabs
      if (requestId !== activeRequestRef.current) {
        return;
      }

      const earningsPayload = rawEarningsRes?.data !== undefined && rawEarningsRes?.status !== undefined ? rawEarningsRes.data : rawEarningsRes;
      const historyPayload = rawHistoryRes?.data !== undefined && rawHistoryRes?.status !== undefined ? rawHistoryRes.data : rawHistoryRes;

      let baseData = {
        grossFare: 0,
        commission: 0,
        platformCharge: 0,
        netEarnings: 0,
        netDriverEarning: 0,
        paidSettlement: 0,
        pendingSettlement: 0,
        completedTrips: 0,
        hoursOnline: 0,
        cashCollected: 0,
        history: []
      };

      const earningsDataObj = earningsPayload?.data || (earningsPayload && earningsPayload.netDriverEarning !== undefined ? earningsPayload : null);

      if (earningsDataObj) {
        const gross = Number(earningsDataObj.grossFare || 0);
        const charge = Number(earningsDataObj.platformCharge !== undefined ? earningsDataObj.platformCharge : (earningsDataObj.commission || 0));
        const net = Number(earningsDataObj.netDriverEarning !== undefined ? earningsDataObj.netDriverEarning : (earningsDataObj.netEarnings || 0));

        baseData = {
          ...baseData,
          ...earningsDataObj,
          grossFare: Math.round(gross * 100) / 100,
          platformCharge: Math.round(charge * 100) / 100,
          commission: Math.round(charge * 100) / 100,
          netEarnings: Math.round(net * 100) / 100,
          netDriverEarning: Math.round(net * 100) / 100,
          paidSettlement: Number(earningsDataObj.paidSettlement || 0),
          pendingSettlement: Number(earningsDataObj.pendingSettlement || 0)
        };
      } else if (earningsPayload?.success === false) {
        setError(earningsPayload.message || 'Failed to fetch earnings summary');
      }

      const historyDataList = Array.isArray(historyPayload)
        ? historyPayload
        : Array.isArray(historyPayload?.data)
        ? historyPayload.data
        : [];

      baseData.history = historyDataList.slice(0, 10);
      setEarningsData(baseData);
    } catch (err) {
      if (requestId === activeRequestRef.current) {
        console.log('Error fetching earnings:', err);
        const errMsg = err.response?.data?.message || err.message || 'Network error fetching earnings';
        setError(errMsg);
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  const effectiveGross = earningsData.grossFare || 0;
  const effectiveCharge = earningsData.platformCharge !== undefined ? earningsData.platformCharge : (earningsData.commission || 0);
  const effectiveNet = earningsData.netDriverEarning !== undefined ? earningsData.netDriverEarning : earningsData.netEarnings;

  // Determine percentage rate dynamically
  const effectiveChargePercentLabel = (() => {
    if (earningsData.percentageRate !== undefined && earningsData.percentageRate !== null) {
      if (earningsData.isEnabled === false || earningsData.percentageRate === 0) {
        return 'Platform Charge (Disabled)';
      }
      return `Platform Charge (${earningsData.percentageRate}%)`;
    }
    if (effectiveGross > 0 && effectiveCharge > 0) {
      const calcRate = Math.round((effectiveCharge / effectiveGross) * 100);
      return `Platform Charge (${calcRate}%)`;
    }
    if (effectiveCharge === 0) {
      return 'Platform Charge (Disabled)';
    }
    return 'Platform Charge';
  })();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('earningsSummary')}</Text>
      </View>

      {/* Period Selector Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'TODAY', label: t('today') || 'Today' },
          { id: 'WEEKLY', label: t('weekly') || 'Weekly' },
          { id: 'MONTHLY', label: t('monthly') || 'Monthly' },
        ].map((tab) => {
          const isActive = period === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setPeriod(tab.id)}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} earnings`}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Error State Banner */}
        {error ? (
          <View style={styles.errorCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.danger} />
              <Text style={styles.errorTitle}>Earnings Sync Notice</Text>
            </View>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchEarnings}>
              <MaterialCommunityIcons name="refresh" size={16} color={COLORS.white} />
              <Text style={styles.retryBtnText}>Retry Sync</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Primary Net Earnings Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroSubtitle}>
                {period === 'TODAY' ? "Today's " : period === 'WEEKLY' ? "This Week's " : "This Month's "}
                {t('netDriverEarnings')}
              </Text>
              <Text style={styles.heroAmount}>₹{Number(effectiveNet || 0).toFixed(2)}</Text>
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
                <Text style={styles.heroBadgeText}>Credited directly to driver wallet</Text>
              </View>
            </View>

            {/* Authoritative Financial Breakdown Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {period === 'TODAY' ? "Today's " : period === 'WEEKLY' ? "Weekly " : "Monthly "}
                {t('fareAndCommissionBreakdown')}
              </Text>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('grossFare')}</Text>
                <Text style={styles.rowValue}>₹{Number(effectiveGross).toFixed(2)}</Text>
              </View>

              <View style={styles.row}>
                <View style={styles.commissionLabelRow}>
                  <Text style={[styles.rowLabel, { color: effectiveCharge > 0 ? COLORS.warning : COLORS.textSecondary }]}>
                    {effectiveChargePercentLabel}
                  </Text>
                  <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.textMuted} />
                </View>
                <Text style={[styles.rowValue, { color: effectiveCharge > 0 ? COLORS.warning : COLORS.success }]}>
                  {effectiveCharge > 0 ? `-₹${Number(effectiveCharge).toFixed(2)}` : '₹0.00'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.totalLabel}>{t('netEarnings')}</Text>
                <Text style={styles.totalValue}>₹{Number(effectiveNet).toFixed(2)}</Text>
              </View>
            </View>

            {/* Settlement Status Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Settlement Status</Text>

              <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="check-decagram" size={16} color={COLORS.success} />
                  <Text style={styles.rowLabel}>Paid / Settled Earnings</Text>
                </View>
                <Text style={[styles.rowValue, { color: COLORS.success, fontWeight: '700' }]}>
                  ₹{Number(earningsData.paidSettlement || 0).toFixed(2)}
                </Text>
              </View>

              <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.rowLabel}>Pending Wallet Settlement</Text>
                </View>
                <Text style={[styles.rowValue, { color: COLORS.warning, fontWeight: '700' }]}>
                  ₹{Number(earningsData.pendingSettlement || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Performance KPIs */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <MaterialCommunityIcons name="car-multiple" size={24} color={COLORS.primary} />
                <Text style={styles.kpiValue}>{earningsData.completedTrips || 0}</Text>
                <Text style={styles.kpiLabel}>{t('completedTrips')}</Text>
              </View>

              <View style={styles.kpiCard}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.info} />
                <Text style={styles.kpiValue}>{earningsData.hoursOnline || 0}h</Text>
                <Text style={styles.kpiLabel}>{t('hoursOnline')}</Text>
              </View>

              <View style={styles.kpiCard}>
                <MaterialCommunityIcons name="cash" size={24} color={COLORS.warning} />
                <Text style={styles.kpiValue}>₹{earningsData.cashCollected || 0}</Text>
                <Text style={styles.kpiLabel}>{t('cashCollected')}</Text>
              </View>
            </View>

            {/* Booking-wise Earning History */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.cardTitle}>Booking-wise Earning History</Text>
                <TouchableOpacity onPress={() => navigation.navigate('RideHistory')}>
                  <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700' }}>View All</Text>
                </TouchableOpacity>
              </View>

              {!earningsData.history || earningsData.history.length === 0 ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>No completed bookings found</Text>
                </View>
              ) : (
                earningsData.history.slice(0, 5).map((b, idx) => {
                  const bGross = Number(b.grossFare !== undefined ? b.grossFare : (b.fare || 0));
                  const bCharge = Number(b.platformCharge !== undefined ? b.platformCharge : 0);
                  const bNet = Number(b.netDriverEarning !== undefined ? b.netDriverEarning : (bGross - bCharge));

                  // Booking specific percentage label
                  const bRate = b.chargeRateOrAmount !== undefined && b.chargeRateOrAmount !== null
                    ? b.chargeRateOrAmount
                    : (bGross > 0 && bCharge > 0 ? Math.round((bCharge / bGross) * 100) : null);
                  const bFeeLabel = bRate !== null && bRate > 0
                    ? `Fee (${bRate}%): ₹${bCharge.toFixed(2)}`
                    : (bCharge === 0 ? 'Fee (0%): ₹0.00' : `Fee: ₹${bCharge.toFixed(2)}`);

                  return (
                    <View key={b.id || b.bookingId || idx} style={{
                      paddingVertical: 10,
                      borderBottomWidth: idx < 4 ? 1 : 0,
                      borderBottomColor: COLORS.border
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>
                          #{b.bookingId || b.id?.slice(-6)?.toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.success }}>
                          +₹{bNet.toFixed(2)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                          Gross: ₹{bGross.toFixed(2)} · {bFeeLabel}
                        </Text>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: b.settlementStatus === 'Paid' || b.paymentStatus === 'Paid' ? COLORS.success : COLORS.warning
                        }}>
                          {b.settlementStatus === 'Paid' || b.paymentStatus === 'Paid' ? 'Settled' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.s,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSurface,
    padding: SPACING.xs,
    marginHorizontal: SPACING.m,
    marginVertical: SPACING.s,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'stretch',
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.s,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  errorCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.danger + '60',
    marginBottom: SPACING.m,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  errorMessage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: SPACING.m,
    borderRadius: RADIUS.s,
    gap: 6,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.success,
    marginVertical: SPACING.xs,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.m,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  commissionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.s,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.success,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
    paddingTop: SPACING.m,
  },
  chartBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: COLORS.bgDark,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 7,
  },
  barDayText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
