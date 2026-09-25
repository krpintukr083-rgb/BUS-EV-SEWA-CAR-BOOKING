import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { driverService } from '../../services/driverService';

export default function CreateScheduleScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await driverService.getMyVehicles();
        if (res.data?.success) {
          const activeVehicles = res.data.data.filter(v => v.vehicleStatus === 'Active');
          setVehicles(activeVehicles);
          if (activeVehicles.length > 0) {
            handleVehicleSelect(activeVehicles[0]);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch vehicles', e);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicleId(vehicle._id);
    setOrigin(vehicle.route?.origin || vehicle.from || '');
    setDestination(vehicle.route?.destination || vehicle.to || '');
  };

  const validateDate = (dateString) => {
    // Basic YYYY-MM-DD validation
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const validateTime = (timeString) => {
    // Basic HH:MM AM/PM validation
    const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9] [APap][mM]$/;
    return regex.test(timeString);
  };

  const handleSubmit = async () => {
    if (!selectedVehicleId) {
      Alert.alert('Error', 'Please select a vehicle.');
      return;
    }
    if (!origin || !destination) {
      Alert.alert('Error', 'Vehicle route is missing (From/To). Please update vehicle route first.');
      return;
    }
    if (!travelDate || !validateDate(travelDate)) {
      Alert.alert('Error', 'Please enter a valid Travel Date in YYYY-MM-DD format (Cannot be in the past).');
      return;
    }
    if (!departureTime || !validateTime(departureTime)) {
      Alert.alert('Error', 'Please enter a valid Departure Time (e.g. 06:00 AM).');
      return;
    }
    if (!arrivalTime || !validateTime(arrivalTime)) {
      Alert.alert('Error', 'Please enter a valid Arrival Time (e.g. 11:30 AM).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicle: selectedVehicleId,
        origin,
        destination,
        travelDate,
        departureTime: departureTime.toUpperCase(),
        arrivalTime: arrivalTime.toUpperCase()
      };
      
      const res = await driverService.createSchedule(payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Schedule created successfully and is Pending Approval.', [
          { text: 'OK', onPress: () => navigation.navigate('MySchedules') }
        ]);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to create schedule.');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Schedule</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="car-outline" size={48} color={COLORS.danger} />
          <Text style={styles.emptyText}>No registered active vehicle available. Please register and activate a vehicle first.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Schedule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: SPACING.sm }}>
            {vehicles.map(v => (
              <TouchableOpacity
                key={v._id}
                style={[styles.vehicleChip, selectedVehicleId === v._id && styles.vehicleChipActive]}
                onPress={() => handleVehicleSelect(v)}
              >
                <Text style={[styles.vehicleChipText, selectedVehicleId === v._id && { color: '#FFF' }]}>
                  {v.vehicleName} ({v.vehicleNumber})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>From / Origin *</Text>
            <View style={styles.inputDisabled}>
              <Text style={styles.inputTextDisabled}>{origin || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>To / Destination *</Text>
            <View style={styles.inputDisabled}>
              <Text style={styles.inputTextDisabled}>{destination || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Travel Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g. 2026-09-25)"
              value={travelDate}
              onChangeText={setTravelDate}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.sm }]}>
              <Text style={styles.label}>Departure Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 06:00 AM"
                value={departureTime}
                onChangeText={setDepartureTime}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.sm }]}>
              <Text style={styles.label}>Arrival Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 11:30 AM"
                value={arrivalTime}
                onChangeText={setArrivalTime}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit for Admin Approval</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  emptyText: { fontSize: 15, color: COLORS.textMuted, marginTop: SPACING.md, textAlign: 'center', lineHeight: 22 },
  scrollContent: { padding: SPACING.md },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  vehicleChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface
  },
  vehicleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  vehicleChipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceLight
  },
  inputTextDisabled: { fontSize: 15, color: COLORS.textSecondary },
  row: { flexDirection: 'row' },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.md
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});
