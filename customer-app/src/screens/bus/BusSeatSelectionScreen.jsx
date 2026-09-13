import React, { useState, useEffect } from 'react';
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
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const seatRows = [
  ['01', '02', 'AISLE', '03', '04'],
  ['05', '06', 'AISLE', '07', '08'],
  ['09', '10', 'AISLE', '11', '12'],
  ['13', '14', 'AISLE', '15', '16'],
  ['17', '18', 'AISLE', '19', '20'],
  ['21', '22', 'AISLE', '23', '24'],
  ['25', '26', 'AISLE', '27', '28'],
  ['29', '30', 'AISLE', '31', '32'],
  ['33', '34', '35', '36', '37'] // Back row
];

const BusSeatSelectionScreen = ({ navigation, route }) => {
  const { busId } = route.params || {};
  const { bookingDraft, updateDraft } = useBooking();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [farePerSeat, setFarePerSeat] = useState(bookingDraft.vehicle?.fareRate || 850);

  useEffect(() => {
    const fetchBusData = async () => {
      if (busId) {
        try {
          const res = await customerService.getBusDetails(busId);
          if (res.success) {
            setFarePerSeat(res.data.fareRate);
            if (res.data.bookedSeats && Array.isArray(res.data.bookedSeats)) {
              setBookedSeats(res.data.bookedSeats);
            }
          }
        } catch (e) {
          console.log('Error fetching bus seat details:', e);
        }
      }
    };
    fetchBusData();
  }, [busId]);

  const toggleSeat = (seatNo) => {
    if (bookedSeats.includes(seatNo)) {
      Alert.alert('Unavailable', `Seat ${seatNo} is already booked by another passenger.`);
      return;
    }

    if (selectedSeats.includes(seatNo)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNo));
    } else {
      if (selectedSeats.length >= 6) {
        Alert.alert('Limit Reached', 'You can select a maximum of 6 seats per booking.');
        return;
      }
      setSelectedSeats([...selectedSeats, seatNo]);
    }
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Select Seat', 'Please select at least one seat to proceed.');
      return;
    }

    const totalFare = selectedSeats.length * farePerSeat;
    updateDraft({
      selectedSeats,
      baseFare: farePerSeat,
      totalFare
    });

    navigation.navigate('PickupDrop');
  };

  return (
    <View style={styles.container}>
      <Header title="Bus Seat Selection" onBack={() => navigation.goBack()} />

      {/* Seat Legend Bar */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.seatLegendBox, styles.seatAvail]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.seatLegendBox, styles.seatSelect]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.seatLegendBox, styles.seatBook]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bus Cabin Outer Shell */}
        <View style={styles.busCabin}>
          {/* Driver Cockpit */}
          <View style={styles.driverSection}>
            <Text style={styles.steeringLabel}>Driver Cockpit</Text>
            <Ionicons name="speedometer-outline" size={24} color="#64748b" />
          </View>

          {/* Seat Grid Layout */}
          <View style={styles.gridContainer}>
            {seatRows.map((row, rIdx) => (
              <View key={rIdx} style={styles.seatRow}>
                {row.map((seat, sIdx) => {
                  if (seat === 'AISLE') {
                    return <View key={sIdx} style={styles.aisleGap} />;
                  }

                  const isBooked = bookedSeats.includes(seat);
                  const isSelected = selectedSeats.includes(seat);

                  return (
                    <TouchableOpacity
                      key={sIdx}
                      style={[
                        styles.seatBox,
                        isBooked && styles.seatBoxBooked,
                        isSelected && styles.seatBoxSelected
                      ]}
                      onPress={() => toggleSeat(seat)}
                      disabled={isBooked}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isBooked ? "close" : isSelected ? "checkmark" : "bed-outline"}
                        size={14}
                        color={isBooked ? '#94a3b8' : isSelected ? '#ffffff' : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.seatNumberText,
                          isBooked && styles.seatTextBooked,
                          isSelected && styles.seatTextSelected
                        ]}
                      >
                        {seat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Selected Seats Summary Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barSeatsLabel}>
            Seats: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
          </Text>
          <Text style={styles.barTotalAmount}>
            Total: ₹{selectedSeats.length * farePerSeat}
          </Text>
        </View>
        <Button
          title="Continue"
          onPress={handleContinue}
          style={{ paddingHorizontal: 32 }}
          disabled={selectedSeats.length === 0}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  seatLegendBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5
  },
  seatAvail: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff'
  },
  seatSelect: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary
  },
  seatBook: {
    borderColor: '#cbd5e1',
    backgroundColor: '#e2e8f0'
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    alignItems: 'center'
  },
  busCabin: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3
  },
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  steeringLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  },
  gridContainer: {
    gap: 12
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  aisleGap: {
    width: 28
  },
  seatBox: {
    width: 52,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  seatBoxBooked: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9'
  },
  seatBoxSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary
  },
  seatNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2
  },
  seatTextBooked: {
    color: '#94a3b8'
  },
  seatTextSelected: {
    color: '#ffffff'
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8
  },
  barSeatsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  barTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  }
});

export default BusSeatSelectionScreen;
