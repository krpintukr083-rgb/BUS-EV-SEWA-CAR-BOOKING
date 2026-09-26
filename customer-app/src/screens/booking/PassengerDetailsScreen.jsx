import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const PassengerDetailsScreen = ({ navigation }) => {
  const { bookingDraft, updateDraft } = useBooking();

  const passengerCount = bookingDraft.serviceType === 'EV-Sewa'
    ? Math.max(1, Number(bookingDraft.passengerCount) || 1)
    : bookingDraft.selectedSeats && bookingDraft.selectedSeats.length > 0
    ? bookingDraft.selectedSeats.length
    : 1;

  const buildPassengers = count => Array.from({ length: count }, (_, index) => ({
    name: bookingDraft.passengerDetails?.[index]?.name || '',
    phone: bookingDraft.passengerDetails?.[index]?.phone || '',
    age: bookingDraft.passengerDetails?.[index]?.age || '',
    gender: bookingDraft.passengerDetails?.[index]?.gender || 'Male',
    ...(bookingDraft.selectedSeats?.[index] ? { seatNumber: bookingDraft.selectedSeats[index] } : {})
  }));
  const [passengers, setPassengers] = useState(() => buildPassengers(passengerCount));

  useEffect(() => {
    setPassengers(current => Array.from({ length: passengerCount }, (_, index) => ({
      name: current[index]?.name ?? bookingDraft.passengerDetails?.[index]?.name ?? '',
      phone: current[index]?.phone ?? bookingDraft.passengerDetails?.[index]?.phone ?? '',
      age: current[index]?.age ?? bookingDraft.passengerDetails?.[index]?.age ?? '',
      gender: current[index]?.gender ?? bookingDraft.passengerDetails?.[index]?.gender ?? 'Male',
      ...(bookingDraft.selectedSeats?.[index] ? { seatNumber: bookingDraft.selectedSeats[index] } : {})
    })));
  }, [passengerCount]);

  const [errors, setErrors] = useState({});

  const updatePassengerField = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);

    // clear error
    if (errors[`${index}_${field}`]) {
      const newErrs = { ...errors };
      delete newErrs[`${index}_${field}`];
      setErrors(newErrs);
    }
  };

  const handleContinue = () => {
    const newErrors = {};
    passengers.forEach((p, idx) => {
      if (!p.name || p.name.trim().length < 2) {
        newErrors[`${idx}_name`] = 'Please enter passenger full name';
      }
      if (!p.phone || p.phone.trim().length < 10) {
        newErrors[`${idx}_phone`] = 'Enter valid 10-digit mobile number';
      }
      if (!p.age || isNaN(p.age) || parseInt(p.age) < 1 || parseInt(p.age) > 120) {
        newErrors[`${idx}_age`] = 'Enter valid age (1-120)';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateDraft({
      passengerDetails: passengers,
      ...(bookingDraft.serviceType === 'EV-Sewa' ? { passengerCount: passengers.length } : {})
    });

    navigation.navigate('FareSummary');
  };

  const getServiceColor = () => {
    if (bookingDraft.serviceType === 'EV-Sewa') return COLORS.evBadge;
    if (bookingDraft.serviceType === 'Car') return '#ea580c';
    return COLORS.primary;
  };

  const serviceColor = getServiceColor();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Header title="Passenger Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Info Header */}
        <View style={styles.topInfo}>
          <Ionicons name="person-circle-outline" size={24} color={serviceColor} />
          <View style={{ flex: 1 }}>
            <Text style={styles.topInfoTitle}>Passenger Information</Text>
            <Text style={styles.topInfoSub}>
              Please enter accurate contact and identification details for all travelers.
            </Text>
          </View>
        </View>

        {/* Passenger Cards */}
        {passengers.map((p, index) => (
          <View key={index} style={styles.passengerCard}>
            <View style={styles.cardHeader}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexBadgeText}>Passenger {index + 1}</Text>
              </View>
              {p.seatNumber && (
                <View style={styles.seatPill}>
                  <Ionicons name="bus" size={12} color={COLORS.primary} />
                  <Text style={styles.seatPillText}>Seat {p.seatNumber}</Text>
                </View>
              )}
            </View>

            {/* Name */}
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Passenger Name *</Text>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={p.name}
                onChangeText={v => updatePassengerField(index, 'name', v)}
                error={errors[`${index}_name`]}
              />
            </View>

            {/* Mobile Number */}
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Mobile Number *</Text>
              <Input
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                maxLength={10}
                value={p.phone}
                onChangeText={v => updatePassengerField(index, 'phone', v)}
                error={errors[`${index}_phone`]}
              />
            </View>

            {/* Age & Gender */}
            <View style={styles.row}>
              <View style={[styles.inputWrap, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Age *</Text>
                <Input
                  placeholder="e.g. 28"
                  keyboardType="numeric"
                  maxLength={3}
                  value={p.age ? String(p.age) : ''}
                  onChangeText={v => updatePassengerField(index, 'age', v)}
                  error={errors[`${index}_age`]}
                />
              </View>

              <View style={[styles.inputWrap, { flex: 1.5 }]}>
                <Text style={styles.label}>Gender *</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map(gender => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderBtn,
                        p.gender === gender && { borderColor: serviceColor, backgroundColor: serviceColor + '10' }
                      ]}
                      onPress={() => updatePassengerField(index, 'gender', gender)}
                    >
                      <Text
                        style={[
                          styles.genderBtnText,
                          p.gender === gender && { color: serviceColor, fontWeight: '700' }
                        ]}
                      >
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Continue Footer */}
      <View style={styles.footer}>
        <Button
          title="Continue to Fare Summary"
          onPress={handleContinue}
          style={{ backgroundColor: serviceColor }}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  topInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  topInfoSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  passengerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8
  },
  indexBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  indexBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  seatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  seatPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  inputWrap: {
    marginBottom: 8
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#ffffff'
  },
  genderBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8
  }
});

export default PassengerDetailsScreen;
