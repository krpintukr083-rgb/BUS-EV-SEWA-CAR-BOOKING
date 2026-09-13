import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import { COLORS } from '../../constants/colors';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await customerService.getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.log('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getNotificationIcon = type => {
    switch (type) {
      case 'Booking_Confirmed':
        return { icon: 'checkmark-circle', color: COLORS.success, bg: '#ecfdf5' };
      case 'Payment_Received':
        return { icon: 'card', color: COLORS.primary, bg: '#eff6ff' };
      case 'Booking_Cancelled':
        return { icon: 'close-circle', color: COLORS.danger, bg: '#fef2f2' };
      case 'Refund_Processed':
        return { icon: 'cash', color: '#059669', bg: '#ecfdf5' };
      default:
        return { icon: 'notifications', color: COLORS.primary, bg: '#eff6ff' };
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Notifications" />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching system notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={54} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySub}>
            Trip updates, booking alerts and payment receipts will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
            />
          }
          renderItem={({ item }) => {
            const iconConfig = getNotificationIcon(item.type);
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Recent';

            return (
              <View style={styles.notificationCard}>
                <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
                  <Ionicons name={iconConfig.icon} size={22} color={iconConfig.color} />
                </View>

                <View style={styles.contentWrap}>
                  <View style={styles.headerRow}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.timeText}>{dateStr}</Text>
                  </View>
                  <Text style={styles.message}>{item.message}</Text>
                </View>
              </View>
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
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  contentWrap: {
    flex: 1
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    flex: 1,
    marginRight: 8
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  message: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18
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

export default NotificationsScreen;
