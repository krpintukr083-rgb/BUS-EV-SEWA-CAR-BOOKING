import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';

export default function RideHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'BUS', 'CAB'

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setError(null);
      const rawRes = await driverService.getRideHistory();
      const payload = rawRes?.data !== undefined && rawRes?.status !== undefined ? rawRes.data : rawRes;
      const historyList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : null;

      if (historyList) {
        setHistory(historyList);
      } else if (payload?.success === false) {
        setError(payload.message || 'Failed to load ride history');
      }
    } catch (err) {
      console.log('Error fetching history:', err);
      const errMsg = err.response?.data?.message || err.message || 'Network error loading ride history';
      setError(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filteredHistory = history.filter((item) => {
    if (filterType === 'BUS') {
      return item.serviceType === 'BUS' || item.serviceType === 'EV_SEWA' || !!item.seats?.length;
    }
    if (filterType === 'CAB') {
      return item.serviceType === 'CAR' || item.serviceType === 'CAB' || !item.seats?.length;
    }
    return true;
  });

  const renderHistoryCard = ({ item }) => {
    const grossFare = Number(item.grossFare !== undefined ? item.grossFare : (item.fare || item.totalFare || 0));
    const platformCharge = Number(item.platformCharge !== undefined ? item.platformCharge : 0);
    const netEarnings = Number(item.netDriverEarning !== undefined ? item.netDriverEarning : (grossFare - platformCharge));
    const isCompleted = item.bookingStatus === 'Completed' || item.status === 'Completed' || item.rideStatus === 'Completed';
    const settlementStatus = item.settlementStatus || (item.paymentStatus === 'Paid' ? 'Paid' : 'Pending');

    const rate = item.chargeRateOrAmount !== undefined && item.chargeRateOrAmount !== null
      ? item.chargeRateOrAmount
      : (grossFare > 0 && platformCharge > 0 ? Math.round((platformCharge / grossFare) * 100) : null);
    const chargeLabel = rate !== null && rate > 0
      ? `Platform Charge (${rate}%)`
      : (platformCharge === 0 ? 'Platform Charge (0%)' : 'Platform Charge');

    return (
      <View style={styles.card}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.tripId}>#{item.bookingId || item._id?.slice(-6)?.toUpperCase()}</Text>
            <Text style={styles.tripDate}>
              {item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent Trip')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={[
              styles.statusBadge,
              settlementStatus === 'Paid'
                ? { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }
                : { backgroundColor: COLORS.warning + '20', borderColor: COLORS.warning }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: settlementStatus === 'Paid' ? COLORS.success : COLORS.warning }
              ]}>
                {settlementStatus === 'Paid' ? 'Settled' : 'Pending'}
              </Text>
            </View>

            <View style={[
              styles.statusBadge,
              isCompleted
                ? { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }
                : { backgroundColor: COLORS.danger + '20', borderColor: COLORS.danger }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: isCompleted ? COLORS.success : COLORS.danger }
              ]}>
                {item.status || item.bookingStatus || item.rideStatus || 'Completed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Route Points */}
        <View style={styles.routeBox}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.pickupLocation || item.pickup || item.from || 'Origin'}
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-down" size={14} color={COLORS.textMuted} style={{ marginLeft: 3 }} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.dropLocation || item.drop || item.to || 'Destination'}
            </Text>
          </View>
        </View>

        {/* Financial Breakdown */}
        <View style={styles.fareBreakdown}>
          <View style={styles.fareCol}>
            <Text style={styles.fareLabel}>{t('grossFare')}</Text>
            <Text style={styles.fareVal}>₹{grossFare.toFixed(2)}</Text>
          </View>
          <View style={styles.fareCol}>
            <Text style={styles.fareLabel}>{chargeLabel}</Text>
            <Text style={[styles.fareVal, { color: platformCharge > 0 ? COLORS.warning : COLORS.success }]}>
              {platformCharge > 0 ? `-₹${platformCharge.toFixed(2)}` : '₹0.00'}
            </Text>
          </View>
          <View style={styles.fareCol}>
            <Text style={styles.fareLabel}>{t('netEarnings')}</Text>
            <Text style={[styles.fareVal, { color: COLORS.success, fontWeight: '800' }]}>
              ₹{netEarnings.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment & Service Type */}
        <View style={styles.bottomRow}>
          <Text style={styles.serviceText}>
            {item.serviceType === 'EV_SEWA' || item.serviceType === 'EV-Sewa' ? '⚡ EV-Sewa' : item.serviceType === 'BUS' || item.serviceType === 'Bus' ? '🚌 Bus' : '🚖 Cab'}
          </Text>
          <Text style={styles.paymentMethodText}>
            Paid via: {item.paymentMethod || 'CASH'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rideHistory')}</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'ALL', label: t('all') },
          { id: 'BUS', label: 'Bus / EV' },
          { id: 'CAB', label: 'Car / Cab' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, filterType === tab.id && styles.tabBtnActive]}
            onPress={() => setFilterType(tab.id)}
          >
            <Text style={[styles.tabText, filterType === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={56} color={COLORS.danger} />
          <Text style={[styles.emptyTitle, { color: COLORS.danger }]}>Failed to Load Rides</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchHistory}>
            <MaterialCommunityIcons name="refresh" size={16} color={COLORS.white} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredHistory.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="history" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('noRidesFound')}</Text>
          <Text style={styles.emptySub}>Completed rides will be displayed here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryCard}
          keyExtractor={(item, index) => item.id || item.bookingId || item._id || index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
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
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.s,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.s,
  },
  tripId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tripDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.s,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  routeBox: {
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.s,
    marginVertical: SPACING.xs,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  fareBreakdown: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.s,
    marginTop: SPACING.s,
  },
  fareCol: {
    flex: 1,
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  fareVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.s,
    paddingTop: SPACING.xs,
  },
  serviceText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  paymentMethodText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.m,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.m,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: SPACING.l,
    borderRadius: RADIUS.s,
    gap: 6,
    marginTop: SPACING.s,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
