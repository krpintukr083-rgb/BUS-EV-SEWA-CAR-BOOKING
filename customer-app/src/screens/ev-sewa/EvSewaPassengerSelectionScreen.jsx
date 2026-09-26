import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const makePassengers = (count, currentPassengers = []) => (
  Array.from({ length: count }, (_, index) => ({
    name: currentPassengers[index]?.name || '',
    phone: currentPassengers[index]?.phone || '',
    age: currentPassengers[index]?.age || '',
    gender: currentPassengers[index]?.gender || 'Male'
  }))
);

const EvSewaPassengerSelectionScreen = ({ navigation }) => {
  const { bookingDraft, updateDraft } = useBooking();
  const rawCapacity = Number(bookingDraft.vehicle?.seatingCapacity);
  const capacity = Number.isInteger(rawCapacity) && rawCapacity > 0 ? rawCapacity : 0;
  const farePerPassenger = Number(bookingDraft.vehicle?.fareRate);
  const hasFare = Number.isFinite(farePerPassenger) && farePerPassenger >= 0;
  const [passengerCount, setPassengerCount] = useState(() => {
    const initialCount = Number(bookingDraft.passengerCount) || 1;
    return capacity ? Math.min(capacity, Math.max(1, initialCount)) : 1;
  });

  const continueToPickup = () => {
    if (!capacity || passengerCount > capacity || !hasFare) return;
    updateDraft({
      passengerCount,
      selectedSeats: [],
      passengerDetails: makePassengers(passengerCount, bookingDraft.passengerDetails),
      baseFare: farePerPassenger,
      totalFare: farePerPassenger * passengerCount
    });
    navigation.navigate('PickupDrop');
  };

  return (
    <View style={styles.container}>
      <Header title="EV-Sewa Passengers" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <View style={styles.vehicleCard}>
          <Ionicons name="leaf" size={22} color={COLORS.evBadge} />
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{bookingDraft.vehicle?.vehicleName || 'EV-Sewa Vehicle'}</Text>
            <Text style={styles.vehicleCapacity}>
              {capacity ? `Capacity: ${capacity} passengers` : 'Passenger capacity unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.selectionCard}>
          <Text style={styles.heading}>How many passengers?</Text>
          <Text style={styles.subheading}>Choose the total number of passengers for this vehicle.</Text>

          <View style={styles.counter}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Decrease passenger count"
              style={[styles.counterButton, passengerCount <= 1 && styles.disabledButton]}
              onPress={() => setPassengerCount(count => Math.max(1, count - 1))}
              disabled={passengerCount <= 1}
            >
              <Ionicons name="remove" size={24} color={COLORS.darkNavy} />
            </TouchableOpacity>
            <View style={styles.countDisplay}>
              <Text style={styles.countText}>{passengerCount}</Text>
              <Text style={styles.countLabel}>Passenger{passengerCount === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Increase passenger count"
              style={[styles.counterButton, (!capacity || passengerCount >= capacity) && styles.disabledButton]}
              onPress={() => setPassengerCount(count => Math.min(capacity, count + 1))}
              disabled={!capacity || passengerCount >= capacity}
            >
              <Ionicons name="add" size={24} color={COLORS.darkNavy} />
            </TouchableOpacity>
          </View>

          <Text style={styles.capacityText}>
            {capacity ? `${passengerCount} / ${capacity} passengers selected` : 'Cannot continue without a valid vehicle capacity.'}
          </Text>
          {hasFare && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Total fare</Text>
              <Text style={styles.fareAmount}>₹{farePerPassenger * passengerCount}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue to Pickup & Drop"
          onPress={continueToPickup}
          style={{ backgroundColor: COLORS.evBadge }}
          disabled={!capacity || !hasFare}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 16 },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { color: COLORS.darkNavy, fontWeight: '800', fontSize: 15 },
  vehicleCapacity: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  selectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20
  },
  heading: { color: COLORS.darkNavy, fontSize: 18, fontWeight: '800' },
  subheading: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 19 },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  counterButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  disabledButton: { opacity: 0.4 },
  countDisplay: { alignItems: 'center', minWidth: 120 },
  countText: { color: COLORS.darkNavy, fontSize: 36, fontWeight: '900' },
  countLabel: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  capacityText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 18 },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 20,
    paddingTop: 16
  },
  fareLabel: { color: COLORS.textSecondary, fontSize: 14 },
  fareAmount: { color: COLORS.evBadge, fontSize: 18, fontWeight: '900' },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  }
});

export default EvSewaPassengerSelectionScreen;
