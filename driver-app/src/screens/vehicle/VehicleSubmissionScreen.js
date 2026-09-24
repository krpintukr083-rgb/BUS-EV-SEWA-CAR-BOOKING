import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import driverService from '../../services/driverService';
import { COLORS, SPACING } from '../../constants/theme';

export default function VehicleSubmissionScreen() {
  const [form, setForm] = useState({
    vehicleNumber: '',
    vehicleType: 'Bus',
    vehicleName: '',
    vehicleModel: '',
    vehicleCategory: '',
    origin: '',
    destination: ''
  });
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!form.vehicleNumber || !form.vehicleType || !form.origin || !form.destination) {
      return Alert.alert('Required', 'Vehicle number, type, origin, and destination are required.');
    }
    setBusy(true);
    try {
      await driverService.registerVehicle({
        ...form,
        route: {
          origin: form.origin.trim(),
          destination: form.destination.trim()
        }
      });
      Alert.alert('Submitted', 'Vehicle is pending admin approval.');
      setForm({
        vehicleNumber: '',
        vehicleType: 'Bus',
        vehicleName: '',
        vehicleModel: '',
        vehicleCategory: '',
        origin: '',
        destination: ''
      });
    }
    catch (e) { Alert.alert('Unable to submit', e?.response?.data?.message || 'Please try again.'); }
    finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Register vehicle</Text>
    <Text style={styles.help}>New vehicles are reviewed by admin before customers can see them.</Text>
    {[
      ['vehicleNumber', 'Vehicle number *'], ['vehicleType', 'Type (Bus, EV-Sewa, Car) *'],
      ['vehicleName', 'Vehicle name'], ['vehicleModel', 'Model'], ['vehicleCategory', 'Category'],
      ['origin', 'From / Origin *'], ['destination', 'To / Destination *']
    ].map(([key, label]) => <TextInput key={key} value={form[key]} onChangeText={v => update(key, v)} placeholder={label} placeholderTextColor={COLORS.textMuted} style={styles.input} />)}
    <TouchableOpacity disabled={busy} onPress={submit} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Submitting…' : 'Submit for approval'}</Text></TouchableOpacity>
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { padding: SPACING.l, backgroundColor: COLORS.bgDark, flexGrow: 1 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: SPACING.s },
  help: { color: COLORS.textSecondary, marginBottom: SPACING.l },
  input: { color: COLORS.textPrimary, backgroundColor: COLORS.bgCard, borderColor: COLORS.border, borderWidth: 1, borderRadius: 8, padding: SPACING.m, marginBottom: SPACING.s },
  button: { backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: 8, alignItems: 'center', marginTop: SPACING.s },
  buttonText: { color: COLORS.white, fontWeight: '700' }
});
