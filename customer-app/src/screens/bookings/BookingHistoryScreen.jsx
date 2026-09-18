import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import StatusBadge from '../../components/StatusBadge';
import { COLORS } from '../../constants/colors';

const BookingHistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await customerService.getMyBookings();
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data.filter(b => ['Completed', 'Cancelled', 'Rejected'].includes(b.bookingStatus))
          : (res.data?.completed || res.data?.all || []);
        setHistory(list);
      }
    } catch (err) {
      console.log('Error fetching history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Booking History" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading previous journeys...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={54} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Trip History Found</Text>
          <Text style={styles.emptySub}>
            All your completed and past transit reservations will be archived here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchHistory();
              }}
            />
          }
          renderItem={({ item }) => {
            const dateStr = item.travelDate
              ? new Date(item.travelDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Past Date';

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BookingDetails', { bookingId: item._id })}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.bookingId}>{item.bookingId}</Text>
                    <Text style={styles.serviceMeta}>
                      {item.serviceType} Service • {dateStr}
                    </Text>
                  </View>
                  <StatusBadge status={item.bookingStatus} />
                </View>

                <View style={styles.vehicleRow}>
                  <Ionicons
                    name={
                      item.serviceType === 'Bus'
                        ? 'bus'
                        : item.serviceType === 'EV-Sewa'
                        ? 'leaf'
                        : 'car-sport'
                    }
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.vehicleText}>
                    {item.vehicle?.busName || item.vehicle?.vehicleName || 'Vehicle'} (
                    {item.vehicle?.busNumber || item.vehicle?.vehicleNumber || 'Reg'})
                  </Text>
                </View>

                <View style={styles.routeContainer}>
                  <Text style={styles.routeText} numberOfLines={1}>
                    📍 {item.pickupLocation} → {item.dropLocation}
                  </Text>
                </View>

                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.fareLabel}>Amount Paid</Text>
                    <Text style={styles.fareAmount}>₹{item.fare}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>Payment: {item.paymentStatus}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  listContent: {
    padding: 16,
    paddingBottom: 30
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  bookingId: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  serviceMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 6
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkNavy
  },
  routeContainer: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginVertical: 6
  },
  routeText: {
    fontSize: 11,
    color: '#475569'
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 6
  },
  fareLabel: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  fareAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  statusPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  statusPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginTop: 16
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  }
});

export default BookingHistoryScreen;
