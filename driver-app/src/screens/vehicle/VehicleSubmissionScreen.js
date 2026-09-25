import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Modal,
  ActivityIndicator
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
  busType: '',
  seatingCapacity: '',
  acType: '',
  origin: '',
  destination: '',
  hireAmount: '',
  batteryPercentage: '',
  estimatedRangeKm: ''
};

function EVBatteryRangeCard({ values, onChange, onSave, saved, saving = false }) {
  return (
    <View style={styles.evCard}>
      <View style={styles.evTopRow}>
        <View style={styles.evChargeColumn}>
          <Text style={styles.evEyebrow}>CURRENT CHARGE</Text>
          <View style={styles.evChargeDisplay}>
            <Text style={styles.evPercentage}>
              {values.batteryPercentage === '' ? '--' : values.batteryPercentage}%
            </Text>
            <MaterialCommunityIcons name="battery-charging-80" size={30} color={COLORS.evGreen} />
          </View>
        </View>
        <View style={styles.evRangeCard}>
          <Text style={styles.evRangeLabel}>Estimated Range</Text>
          <View style={styles.evRangeInputRow}>
            <TextInput
              value={values.estimatedRangeKm}
              onChangeText={value => onChange('estimatedRangeKm', value)}
              placeholder="--"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              style={styles.evRangeInput}
            />
            <Text style={styles.evRangeUnit}>km</Text>
          </View>
        </View>
      </View>

      <View style={styles.evProgressTrack}>
        <View
          style={[
            styles.evProgressFill,
            {
              width: `${Math.min(100, Math.max(0, Number(values.batteryPercentage) || 0))}%`
            }
          ]}
        />
      </View>

      <View style={styles.evInputRow}>
        <View style={styles.evBatteryInputWrap}>
          <TextInput
            value={values.batteryPercentage}
            onChangeText={value => onChange('batteryPercentage', value)}
            placeholder="Battery %"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            maxLength={3}
            style={styles.evBatteryInput}
          />
          <Text style={styles.evPercentUnit}>%</Text>
        </View>
        <TouchableOpacity
          onPress={onSave}
          style={[styles.evSaveButton, saved && styles.evSaveButtonSaved, saving && { opacity: 0.6 }]}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.evSaveButtonText}>{saving ? 'Saving...' : saved ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function VehicleSubmissionScreen({ navigation, route }) {
  const vehicleId = route?.params?.vehicleId;
  const isEditing = Boolean(vehicleId);
  const [category, setCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [vehicleSource, setVehicleSource] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [evValues, setEvValues] = useState({ batteryPercentage: '', estimatedRangeKm: '' });
  const [evValuesSaved, setEvValuesSaved] = useState(false);
  const [loadingVehicle, setLoadingVehicle] = useState(isEditing);
  const [editLoadError, setEditLoadError] = useState('');
  const [photos, setPhotos] = useState({ front: null, back: null, left: null, right: null });
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!vehicleId) return undefined;
    let mounted = true;

    const loadVehicle = async () => {
      try {
        const response = await driverService.getVehicle(vehicleId);
        const vehicle = response?.data?.data;
        if (!vehicle || vehicle.vehicleType !== 'EV-Sewa') {
          throw new Error('EV vehicle not found or unavailable for editing.');
        }
        const values = {
          batteryPercentage: vehicle.evDetails?.batteryPercentage == null
            ? ''
            : String(vehicle.evDetails.batteryPercentage),
          estimatedRangeKm: vehicle.evDetails?.rangeKm == null
            ? ''
            : String(vehicle.evDetails.rangeKm)
        };
        if (mounted) {
          setCategory('EV-Sewa');
          setForm(current => ({
            ...current,
            ...values,
            vehicleName: vehicle.vehicleName || '',
            vehicleNumber: vehicle.vehicleNumber || ''
          }));
          setEvValues(values);
          setEvValuesSaved(true);
        }
      } catch (error) {
        if (mounted) setEditLoadError(error?.response?.data?.message || error.message || 'Unable to load EV details.');
      } finally {
        if (mounted) setLoadingVehicle(false);
      }
    };

    loadVehicle();
    return () => {
      mounted = false;
    };
  }, [vehicleId]);

  const selectCategory = value => {
    setCategoryOpen(false);
    setCategory(value);
    setForm(current => ({ ...current, vehicleType: value }));
    if (value === 'EV-Sewa') {
      setEvValues({
        batteryPercentage: form.batteryPercentage,
        estimatedRangeKm: form.estimatedRangeKm
      });
    }
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

  const saveEVValues = async () => {
    const batteryPercentage = Number(evValues.batteryPercentage);
    const estimatedRangeKm = Number(evValues.estimatedRangeKm);
    if (
      evValues.batteryPercentage.trim() === '' ||
      !Number.isFinite(batteryPercentage) ||
      batteryPercentage < 0 ||
      batteryPercentage > 100
    ) {
      Alert.alert('Invalid battery charge', 'Enter a battery percentage from 0 to 100.');
      return false;
    }
    if (
      evValues.estimatedRangeKm.trim() === '' ||
      !Number.isFinite(estimatedRangeKm) ||
      estimatedRangeKm < 0
    ) {
      Alert.alert('Invalid estimated range', 'Enter a valid estimated range in km.');
      return false;
    }

    setForm(current => ({
      ...current,
      batteryPercentage: String(batteryPercentage),
      estimatedRangeKm: String(estimatedRangeKm)
    }));
    setEvValues({
      batteryPercentage: String(batteryPercentage),
      estimatedRangeKm: String(estimatedRangeKm)
    });
    setEvValuesSaved(true);

    if (isEditing) {
      setBusy(true);
      try {
        const response = await driverService.updateVehicleEVDetails(
          vehicleId,
          batteryPercentage,
          estimatedRangeKm
        );
        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to save EV details.');
        }
        Alert.alert('Saved', 'EV battery charge and range updated.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } catch (error) {
        Alert.alert('Unable to save', error?.response?.data?.message || error?.message || 'Please try again.');
        return false;
      } finally {
        setBusy(false);
      }
    }
    return true;
  };

  const updateEVValue = (key, value) => {
    setEvValues(current => ({ ...current, [key]: value }));
    setEvValuesSaved(false);
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
    if (category === 'Bus' && (!form.vehicleName?.trim() || !form.seatingCapacity)) {
      Alert.alert('Required', 'Bus Name and Seating Capacity are required for buses.');
      return;
    }
    if (category === 'EV-Sewa' && !evValuesSaved) {
      Alert.alert('Save EV details', 'Enter the battery charge and estimated range, then tap Save.');
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
        vehicleCategory: form.vehicleCategory || (category === 'Bus' ? (form.busType || 'Bus') : undefined),
        acType: form.acType,
        seatingCapacity: form.seatingCapacity ? Number(form.seatingCapacity) : undefined,
        route: {
          origin: form.origin.trim(),
          destination: form.destination.trim()
        }
      };

      if (category === 'Bus') {
        payload.busDetails = { busType: form.busType || 'Bus' };
      }

      if (category === 'EV-Sewa') {
        payload.evDetails = {
          batteryPercentage: Number(form.batteryPercentage),
          rangeKm: Number(form.estimatedRangeKm)
        };
      }

      if (vehicleSource === 'THIRD_PARTY') {
        payload.hireDetails = { hireAmount: Number(form.hireAmount) || 0 };
      }

      const res = await driverService.registerVehicle(payload);
      const vehicleId = res.data?.success && res.data.data?._id;
      if (!vehicleId) {
        throw new Error(res.data?.message || 'Vehicle registration did not return a vehicle ID.');
      }

      const imageData = new FormData();
      imageData.append('vehicleId', vehicleId);
      imageData.append('vehicleImages', photos.front);
      imageData.append('vehicleImages', photos.back);
      imageData.append('vehicleImages', photos.left);
      imageData.append('vehicleImages', photos.right);
      await driverService.uploadVehicleImages(imageData);

      Alert.alert('Submitted', 'Vehicle is pending admin approval.', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') }
      ]);
      setCategory('');
      setVehicleSource('');
      setForm(EMPTY_FORM);
      setEvValues({ batteryPercentage: '', estimatedRangeKm: '' });
      setEvValuesSaved(false);
      setPhotos({ front: null, back: null, left: null, right: null });
    } catch (e) {
      Alert.alert('Unable to submit', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (isEditing) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.editBackButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textPrimary} />
          <Text style={styles.editBackText}>Back to vehicle</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit EV Battery / Range</Text>
        {loadingVehicle ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : editLoadError ? (
          <Text style={styles.help}>{editLoadError}</Text>
        ) : (
          <>
            <Text style={styles.help}>
              {form.vehicleName || form.vehicleNumber}
              {form.vehicleName && form.vehicleNumber ? ` • ${form.vehicleNumber}` : ''}
            </Text>
            <EVBatteryRangeCard
              values={evValues}
              onChange={updateEVValue}
              onSave={saveEVValues}
              saved={evValuesSaved}
              saving={busy}
            />
          </>
        )}
      </ScrollView>
    );
  }

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

      {(category === 'Bus' ? [
        ['vehicleNumber', 'Vehicle number *'],
        ['vehicleName', 'Bus Name / Vehicle Name *'],
        ['vehicleModel', 'Bus Model'],
        ['busType', 'Bus Type'],
        ['seatingCapacity', 'Seating Capacity *'],
        ['acType', 'AC / Non-AC']
      ] : [
        ['vehicleNumber', 'Vehicle number *'],
        ['vehicleName', 'Vehicle name'],
        ['vehicleModel', 'Model'],
        ['seatingCapacity', 'Seating Capacity'],
        ['acType', 'AC / Non-AC']
      ]).map(([key, label]) => (
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

      {category === 'EV-Sewa' && (
        <EVBatteryRangeCard
          values={evValues}
          onChange={updateEVValue}
          onSave={saveEVValues}
          saved={evValuesSaved}
        />
      )}

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
  editBackButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, marginBottom: SPACING.l },
  editBackText: { color: COLORS.textPrimary, fontWeight: '700' },
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
  evCard: {
    backgroundColor: '#111B30',
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: SPACING.l,
    marginVertical: SPACING.m
  },
  evTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  evChargeColumn: { flex: 1 },
  evEyebrow: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  evChargeDisplay: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, marginTop: SPACING.s },
  evPercentage: { color: COLORS.evGreen, fontSize: 30, fontWeight: '800' },
  evRangeCard: {
    minWidth: 118,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s
  },
  evRangeLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  evRangeInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  evRangeInput: { color: COLORS.textPrimary, fontSize: 21, fontWeight: '800', minWidth: 42, padding: 0 },
  evRangeUnit: { color: COLORS.textSecondary, fontSize: 13, marginLeft: 3 },
  evProgressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: SPACING.l,
    marginBottom: SPACING.m
  },
  evProgressFill: { height: '100%', backgroundColor: COLORS.evGreen, borderRadius: 8 },
  evInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
  evBatteryInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderHighlight,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.m
  },
  evBatteryInput: { flex: 1, color: COLORS.textPrimary, paddingVertical: SPACING.m },
  evPercentUnit: { color: COLORS.textSecondary, fontWeight: '700' },
  evSaveButton: {
    minWidth: 88,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderRadius: 8
  },
  evSaveButtonSaved: { backgroundColor: COLORS.success },
  evSaveButtonText: { color: COLORS.white, fontWeight: '800' },
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
