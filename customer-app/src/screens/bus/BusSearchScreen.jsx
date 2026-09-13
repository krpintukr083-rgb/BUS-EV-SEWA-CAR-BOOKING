import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const popularRoutes = [
  { from: 'Delhi', to: 'Jaipur' },
  { from: 'Delhi', to: 'Agra' },
  { from: 'Delhi', to: 'Chandigarh' },
  { from: 'Jaipur', to: 'Delhi' }
];

const BusSearchScreen = ({ navigation }) => {
  const { updateDraft, bookingDraft } = useBooking();
  const [fromLocation, setFromLocation] = useState('Delhi');
  const [toLocation, setToLocation] = useState('Jaipur');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSearch = () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      Alert.alert('Required', 'Please enter origin and destination locations.');
      return;
    }

    updateDraft({
      serviceType: 'Bus',
      pickupLocation: fromLocation.trim(),
      dropLocation: toLocation.trim(),
      travelDate
    });

    navigation.navigate('BusListing', { from: fromLocation.trim(), to: toLocation.trim() });
  };

  const handleSwap = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  return (
    <View style={styles.container}>
      <Header title="Bus Search" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchCard}>
          <Text style={styles.cardHeaderTitle}>Find Available Buses</Text>
          <Text style={styles.cardHeaderSub}>Direct intercity AC Sleeper & Luxury Coaches</Text>

          {/* From & To Inputs with Swap button */}
          <View style={styles.locationsWrapper}>
            <Input
              label="From Location"
              placeholder="e.g. Delhi ISBT"
              value={fromLocation}
              onChangeText={setFromLocation}
              icon={<Ionicons name="location-outline" size={18} color={COLORS.primary} />}
            />

            <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
              <Ionicons name="swap-vertical" size={20} color="#ffffff" />
            </TouchableOpacity>

            <Input
              label="To Location"
              placeholder="e.g. Jaipur Sindhi Camp"
              value={toLocation}
              onChangeText={setToLocation}
              icon={<Ionicons name="navigate-outline" size={18} color="#ef4444" />}
            />
          </View>

          <Input
            label="Travel Date (YYYY-MM-DD)"
            placeholder="2026-09-15"
            value={travelDate}
            onChangeText={setTravelDate}
            icon={<Ionicons name="calendar-outline" size={18} color={COLORS.primary} />}
          />

          <Button
            title="Search Buses"
            onPress={handleSearch}
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Popular Intercity Routes */}
        <View style={styles.popularSection}>
          <Text style={styles.popularTitle}>Popular Bus Routes</Text>
          <View style={styles.popularGrid}>
            {popularRoutes.map((route, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.routeChip}
                onPress={() => {
                  setFromLocation(route.from);
                  setToLocation(route.to);
                }}
              >
                <Ionicons name="bus-outline" size={16} color={COLORS.primary} />
                <Text style={styles.routeChipText}>
                  {route.from} → {route.to}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    padding: 20
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  cardHeaderSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20
  },
  locationsWrapper: {
    position: 'relative'
  },
  swapButton: {
    position: 'absolute',
    right: 12,
    top: 60,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4
  },
  popularSection: {
    marginTop: 24
  },
  popularTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 12
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10
  },
  routeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary
  }
});

export default BusSearchScreen;
