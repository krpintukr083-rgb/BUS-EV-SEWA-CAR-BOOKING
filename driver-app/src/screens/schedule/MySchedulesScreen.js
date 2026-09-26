import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { driverService } from '../../services/driverService';

export default function MySchedulesScreen({ navigation }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingScheduleId, setRemovingScheduleId] = useState(null);

  const fetchSchedules = async () => {
    try {
      const res = await driverService.getMySchedules();
      if (res.data?.success) {
        setSchedules(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to fetch schedules', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const removeSchedule = (schedule) => {
    Alert.alert(
      'Remove Schedule?',
      'Are you sure you want to remove this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingScheduleId(schedule._id);
            try {
              await driverService.removeSchedule(schedule._id);
              await fetchSchedules();
              Alert.alert('Success', 'Schedule removed successfully.');
            } catch (error) {
              Alert.alert(
                'Unable to remove schedule',
                error.response?.data?.message || error.message || 'Please try again.'
              );
            } finally {
              setRemovingScheduleId(null);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return COLORS.success;
      case 'Pending': return COLORS.warning;
      case 'Rejected': return COLORS.danger;
      default: return COLORS.textMuted;
    }
  };

  const renderItem = ({ item }) => {
    const vehicle = item.vehicle || {};
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.vehicleName}>{vehicle.vehicleName || 'Vehicle'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.vehicleType}>{vehicle.vehicleNumber} • {vehicle.vehicleType}</Text>

        <View style={styles.routeContainer}>
          <Ionicons name="location-outline" size={16} color={COLORS.primary} />
          <Text style={styles.routeText}>{item.origin} → {item.destination}</Text>
        </View>

        <View style={styles.timeContainer}>
          <View style={styles.timeItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>{new Date(item.travelDate).toDateString()}</Text>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>{item.departureTime} - {item.arrivalTime}</Text>
          </View>
        </View>

        {item.status === 'Rejected' && item.rejectionReason ? (
          <Text style={styles.rejectionReason}>Reason: {item.rejectionReason}</Text>
        ) : null}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeSchedule(item)}
          disabled={removingScheduleId === item._id}
          accessibilityRole="button"
          accessibilityLabel={`Remove schedule ${item.origin} to ${item.destination}`}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          <Text style={styles.removeButtonText}>
            {removingScheduleId === item._id ? 'Removing...' : 'Remove'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedules</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No schedules found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { padding: SPACING.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyText: { fontSize: 15, color: COLORS.textMuted, marginTop: SPACING.md },
  listContent: { padding: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  vehicleType: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  routeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, gap: 6 },
  routeText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 13, color: COLORS.textSecondary },
  rejectionReason: { fontSize: 12, color: COLORS.danger, marginTop: SPACING.sm, fontStyle: 'italic' },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: SPACING.md
  },
  removeButtonText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' }
});
