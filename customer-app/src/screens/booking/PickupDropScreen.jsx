import React, { useState } from 'react';
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

const PickupDropScreen = ({ navigation }) => {
  const { bookingDraft, updateDraft } = useBooking();

  const [pickup, setPickup] = useState(
    bookingDraft.pickupLocation ||
    bookingDraft.vehicle?.pickupDropDetails?.pickupLocation ||
    bookingDraft.vehicle?.route?.origin ||
    ''
  );
  const [drop, setDrop] = useState(
    bookingDraft.dropLocation ||
    bookingDraft.vehicle?.pickupDropDetails?.dropLocation ||
    bookingDraft.vehicle?.route?.destination ||
    ''
  );
  const [errors, setErrors] = useState({});

  const handleContinue = () => {
    let errs = {};
    if (!pickup.trim()) errs.pickup = 'Please enter a valid pickup location';
    if (!drop.trim()) errs.drop = 'Please enter a valid dropping point';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    updateDraft({
      pickupLocation: pickup.trim(),
      dropLocation: drop.trim()
    });

    navigation.navigate('PassengerDetails');
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
      <Header title="Pickup & Drop" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Selected Vehicle Card */}
        <View style={styles.vehicleSummaryCard}>
          <View style={[styles.servicePill, { backgroundColor: serviceColor + '15' }]}>
            <Text style={[styles.servicePillText, { color: serviceColor }]}>
              {bookingDraft.serviceType} Service
            </Text>
          </View>
          <Text style={styles.vehicleName}>
            {bookingDraft.vehicle?.busName || bookingDraft.vehicle?.vehicleName || 'Transportation Vehicle'}
          </Text>
          <Text style={styles.vehicleDetails}>
            {bookingDraft.vehicle?.busNumber || bookingDraft.vehicle?.vehicleNumber} • {bookingDraft.vehicle?.busType || bookingDraft.vehicle?.vehicleModel || 'Standard'}
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Boarding & Dropping Points</Text>

          {/* Pickup Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="radio-button-on" size={16} color={COLORS.primary} />
              <Text style={styles.inputLabel}>Pickup Location / Terminal</Text>
            </View>
            <Input
              placeholder="e.g. Kashmere Gate ISBT / Airport T3"
              value={pickup}
              onChangeText={t => {
                setPickup(t);
                if (errors.pickup) setErrors({ ...errors, pickup: null });
              }}
              error={errors.pickup}
            />
          </View>

          {/* Swap Indicator */}
          <View style={styles.routeConnector}>
            <View style={styles.verticalLine} />
            <View style={styles.iconCircle}>
              <Ionicons name="swap-vertical" size={16} color={COLORS.textSecondary} />
            </View>
            <View style={styles.verticalLine} />
          </View>

          {/* Drop Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="location" size={16} color="#ef4444" />
              <Text style={styles.inputLabel}>Drop-off Location / Stand</Text>
            </View>
            <Input
              placeholder="e.g. Sindhi Camp Bus Stand / Cyber Hub"
              value={drop}
              onChangeText={t => {
                setDrop(t);
                if (errors.drop) setErrors({ ...errors, drop: null });
              }}
              error={errors.drop}
            />
          </View>
        </View>

        {/* Help Note */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Driver will arrive at your designated pickup point 15 minutes before the departure time.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Continue"
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
  vehicleSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  servicePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6
  },
  servicePillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  vehicleDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 4
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkNavy
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    height: 32
  },
  verticalLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  infoText: {
    fontSize: 12,
    color: '#1e40af',
    flex: 1,
    lineHeight: 18
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

export default PickupDropScreen;
