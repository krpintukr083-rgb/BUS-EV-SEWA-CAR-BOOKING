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

const MyBookingsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Upcoming'); // 'Upcoming' | 'Completed'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await customerService.getMyBookings();
      if (res && res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.all || []);
        setBookings(list);
      }
    } catch (err) {
      console.log('Error fetching my bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const upcomingBookings = bookings.filter(
    b => b.bookingStatus === 'Pending' || b.bookingStatus === 'Confirmed' || b.bookingStatus === 'In-Transit'
  );

  const completedBookings = bookings.filter(
    b => b.bookingStatus === 'Completed' || b.bookingStatus === 'Cancelled'
  );

  const displayedBookings = activeTab === 'Upcoming' ? upcomingBookings : completedBookings;

  return (
    <View style={styles.container}>
      <Header
        title="My Bookings"
        rightIcon="time-outline"
        onRightPress={() => navigation.navigate('BookingHistory')}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Upcoming' && styles.activeTabBtn]}
          onPress={() => setActiveTab('Upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'Upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Completed' && styles.activeTabBtn]}
          onPress={() => setActiveTab('Completed')}
        >
          <Text style={[styles.tabText, activeTab === 'Completed' && styles.activeTabText]}>
            Completed & Past ({completedBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your journeys...</Text>
        </View>
      ) : displayedBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} bookings</Text>
          <Text style={styles.emptySub}>
            {activeTab === 'Upcoming'
              ? 'Ready for your next trip? Explore bus, EV-Sewa or car rentals now!'
              : 'Your completed and cancelled trip records will appear here.'}
          </Text>
          {activeTab === 'Upcoming' && (
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.bookNowText}>Book a Journey</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedBookings}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBookings();
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
              : 'Today';

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BookingDetails', { bookingId: item._id })}
              >
                {/* Header row */}
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.bookingCode}>{item.bookingId}</Text>
                    <Text style={styles.serviceType}>
                      {item.serviceType} Service • {dateStr}
                    </Text>
                  </View>
                  <StatusBadge status={item.bookingStatus} />
                </View>

                {/* Vehicle & Route */}
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
                  <Text style={styles.vehicleName}>
                    {item.vehicle?.busName || item.vehicle?.vehicleName || 'Transportation'} (
                    {item.vehicle?.busNumber || item.vehicle?.vehicleNumber || 'Registered'})
                  </Text>
                </View>

                {/* Route */}
                <View style={styles.routeBox}>
                  <View style={styles.routePoint}>
                    <View style={styles.dotStart} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {item.pickupLocation}
                    </Text>
                  </View>
                  <View style={styles.routePoint}>
                    <View style={styles.dotEnd} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {item.dropLocation}
                    </Text>
                  </View>
                </View>

                {/* Footer info */}
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.fareLabel}>Paid Amount</Text>
                    <Text style={styles.fareVal}>₹{item.fare}</Text>
                  </View>

                  <View style={styles.viewDetailsBtn}>
                    <Text style={styles.viewDetailsText}>Booking Details</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTabBtn: {
    borderBottomColor: COLORS.primary
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '800'
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
    marginBottom: 10
  },
  bookingCode: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  serviceType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6
  },
  vehicleName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkNavy,
    flex: 1
  },
  routeBox: {
    marginBottom: 12
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444'
  },
  routeText: {
    fontSize: 12,
    color: '#334155',
    flex: 1
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10
  },
  fareLabel: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  fareVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
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
  },
  bookNowBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  bookNowText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  }
});

export default MyBookingsScreen;
