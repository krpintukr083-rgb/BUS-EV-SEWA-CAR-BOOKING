import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import driverService from '../../services/driverService';
import { COLORS, SPACING } from '../../constants/theme';

const CATEGORIES = [
  { value: 'Bus', label: 'Bus', icon: '🚌' },
  { value: 'Car', label: 'Car', icon: '🚗' },
  { value: 'EV-Sewa', label: 'EV-Sewa', icon: '⚡' }
];

const VEHICLE_SOURCES = [
  { value: 'OWN', label: 'Own Vehicle' },
  { value: 'THIRD_PARTY', label: 'Third-Party / Market Hired' }
];

const EMPTY_FORM = {
  vehicleNumber: '',
  vehicleName: '',
  vehicleType: '',
  vehicleModel: '',
  vehicleCategory: '',
  fuelType: '',
  seatingCapacity: '',
  acType: '',
  origin: '',
  destination: '',
  hireAmount: ''
};

export default function VehicleSubmissionScreen() {
  const [category, setCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [vehicleSource, setVehicleSource] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState({ front: null, back: null, left: null, right: null });
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const selectCategory = value => {
    setCategoryOpen(false);
    setCategory(value);
    setForm(current => ({ ...current, vehicleType: value }));
  };

  const selectSource = value => {
    setSourceOpen(false);
    setVehicleSource(value);
  };

  const pickPhoto = async type => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to upload vehicle photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1
    });

    if (result.canceled || result.cancelled) return;
    const asset = result.assets ? result.assets[0] : result;
    if (!asset?.uri) return;

    const extension = asset.uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
    if (!['jpg', 'jpeg', 'png'].includes(extension)) {
      Alert.alert('Invalid image', 'Please select a JPG, JPEG, or PNG image.');
      return;
    }

    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (fileInfo.exists && fileInfo.size > 5 * 1024 * 1024) {
      Alert.alert('Image too large', 'Each vehicle image must be 5 MB or smaller.');
      return;
    }

    setPhotos(current => ({
      ...current,
      [type]: {
        uri: asset.uri,
        name: `vehicle-${type}.${extension}`,
        type: asset.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg')
      }
    }));
  };

  const submit = async () => {
    if (!category) {
      Alert.alert('Select driver category', 'Choose Bus, Car, or EV-Sewa before continuing.');
      return;
    }
    if (!vehicleSource) {
      Alert.alert('Select vehicle source', 'Choose Own Vehicle or Third-Party / Market Hired before continuing.');
      return;
    }
    if (!form.vehicleNumber?.trim() || !form.origin?.trim() || !form.destination?.trim()) {
      Alert.alert('Required', 'Vehicle number, origin, and destination are required.');
      return;
    }
    if (!photos.front || !photos.back || !photos.left || !photos.right) {
      Alert.alert('Vehicle photos required', 'Upload all 4 vehicle photos (Front, Back, Left, Right).');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        vehicleNumber: form.vehicleNumber.trim(),
        vehicleName: form.vehicleName,
        vehicleType: category,
        vehicleSource,
        vehicleModel: form.vehicleModel,
        vehicleCategory: form.vehicleCategory,
        fuelType: form.fuelType,
        acType: form.acType,
        seatingCapacity: form.seatingCapacity ? Number(form.seatingCapacity) : undefined,
        route: {
          origin: form.origin.trim(),
          destination: form.destination.trim()
        }
      };

      if (vehicleSource === 'THIRD_PARTY') {
        payload.hireDetails = { hireAmount: Number(form.hireAmount) || 0 };
      }

      await driverService.registerVehicle(payload);

      const imageData = new FormData();
      imageData.append('vehicleImages', photos.front);
      imageData.append('vehicleImages', photos.back);
      imageData.append('vehicleImages', photos.left);
      imageData.append('vehicleImages', photos.right);
      await driverService.uploadVehicleImages(imageData);

      Alert.alert('Submitted', 'Vehicle is pending admin approval.');
      setCategory('');
      setVehicleSource('');
      setForm(EMPTY_FORM);
      setPhotos({ front: null, back: null, left: null, right: null });
    } catch (e) {
      Alert.alert('Unable to submit', e?.response?.data?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register vehicle</Text>
      <Text style={styles.help}>New vehicles are reviewed by admin before customers can see them.</Text>
      <Text style={styles.sectionTitle}>Driver Category *</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setCategoryOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={category ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {category || 'Select driver category'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Vehicle Source *</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setSourceOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={vehicleSource ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {vehicleSource
            ? VEHICLE_SOURCES.find(item => item.value === vehicleSource)?.label
            : 'Select vehicle source'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      {[
        ['vehicleNumber', 'Vehicle number *'],
        ['vehicleName', 'Vehicle name'],
        ['vehicleModel', 'Model'],
        ['fuelType', 'Fuel Type'],
        ['seatingCapacity', 'Seating Capacity'],
        ['acType', 'AC / Non-AC']
      ].map(([key, label]) => (
        <TextInput
          key={key}
          value={form[key]}
          onChangeText={value => update(key, value)}
          placeholder={label}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={key === 'seatingCapacity' ? 'numeric' : 'default'}
          style={styles.input}
        />
      ))}

      <Text style={styles.sectionTitle}>Vehicle Photos *</Text>
      <Text style={styles.help}>Minimum 4 clear photos of your vehicle are required.</Text>
      <View style={[styles.photoRow, { flexWrap: 'wrap' }]}>
        {['front', 'back', 'left', 'right'].map(type => (
          <TouchableOpacity key={type} style={styles.photoBox} onPress={() => pickPhoto(type)} activeOpacity={0.8}>
            {photos[type] ? (
              <>
                <Image source={{ uri: photos[type].uri }} style={styles.photoPreview} />
                <View style={styles.replaceBadge}>
                  <MaterialCommunityIcons name="camera-retake-outline" size={16} color={COLORS.white} />
                  <Text style={styles.replaceText}>Replace</Text>
                </View>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="image-outline" size={30} color={COLORS.textSecondary} />
                <MaterialCommunityIcons name="cloud-upload-outline" size={22} color={COLORS.primaryLight} />
                <Text style={styles.uploadText}>Upload Photo</Text>
              </>
            )}
            <Text style={styles.photoLabel}>{
              type === 'front' ? 'Front Photo' : 
              type === 'back' ? 'Back Photo' : 
              type === 'left' ? 'Left Photo' : 'Right Photo'
            }</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Route Details</Text>
      <TextInput
        value={form.origin}
        onChangeText={value => update('origin', value)}
        placeholder="Select / Enter Origin *"
        placeholderTextColor={COLORS.textMuted}
        style={styles.input}
      />
      <TextInput
        value={form.destination}
        onChangeText={value => update('destination', value)}
        placeholder="Select / Enter Destination *"
        placeholderTextColor={COLORS.textMuted}
        style={styles.input}
      />

      {vehicleSource === 'THIRD_PARTY' && (
        <>
          <Text style={styles.sectionTitle}>Market Hire Details</Text>
          <TextInput
            value={form.hireAmount}
            onChangeText={value => update('hireAmount', value)}
            placeholder="Market Hire Amount"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            style={styles.input}
          />
        </>
      )}

      <TouchableOpacity disabled={busy} onPress={submit} style={styles.button}>
        <Text style={styles.buttonText}>{busy ? 'Submitting...' : 'Submit for approval'}</Text>
      </TouchableOpacity>

      <Modal
        visible={categoryOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCategoryOpen(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownMenuTitle}>Driver Category *</Text>
            {CATEGORIES.map(item => (
              <TouchableOpacity
                key={item.value}
                style={styles.dropdownOption}
                onPress={() => selectCategory(item.value)}
              >
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={styles.categoryText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={sourceOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSourceOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSourceOpen(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownMenuTitle}>Vehicle Source *</Text>
            {VEHICLE_SOURCES.map(item => (
              <TouchableOpacity
                key={item.value}
                style={styles.dropdownOption}
                onPress={() => selectSource(item.value)}
              >
                <Text style={styles.categoryText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.l, backgroundColor: COLORS.bgDark, flexGrow: 1 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: SPACING.s },
  help: { color: COLORS.textSecondary, marginBottom: SPACING.l },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: SPACING.s },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.l,
    marginBottom: SPACING.s
  },
  categoryIcon: { fontSize: 28, marginRight: SPACING.m },
  categoryText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.l
  },
  dropdownPlaceholder: { color: COLORS.textMuted, fontSize: 15 },
  dropdownValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  dropdownArrow: { color: COLORS.primaryLight, fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: SPACING.l
  },
  dropdownMenu: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.m
  },
  dropdownMenuTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    padding: SPACING.s,
    marginBottom: SPACING.s
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    padding: SPACING.m
  },
  selectedCategory: {
    backgroundColor: COLORS.badgeBg,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.m,
    marginBottom: SPACING.l
  },
  selectedCategoryLabel: { color: COLORS.textSecondary, fontSize: 12 },
  selectedCategoryValue: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 3 },
  changeCategory: { color: COLORS.primaryLight, fontWeight: '700', marginTop: 8 },
  input: {
    color: COLORS.textPrimary,
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.m,
    marginBottom: SPACING.s
  },
  photoRow: { flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.l },
  photoBox: {
    width: '47%',
    height: 150,
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  photoPreview: { width: '100%', flex: 1 },
  uploadText: { color: COLORS.textSecondary, fontWeight: '700', marginBottom: SPACING.s },
  photoLabel: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '800', padding: SPACING.s },
  replaceBadge: {
    position: 'absolute',
    top: SPACING.s,
    right: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 6,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4
  },
  replaceText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  button: { backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: 8, alignItems: 'center', marginTop: SPACING.s },
  buttonText: { color: COLORS.white, fontWeight: '700' }
});
