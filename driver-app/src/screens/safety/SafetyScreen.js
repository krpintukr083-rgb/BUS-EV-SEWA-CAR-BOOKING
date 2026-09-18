import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import SafetySOSModal from '../../components/SafetySOSModal';

export default function SafetyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [emergencyPhone1, setEmergencyPhone1] = useState('9801234567');
  const [emergencyPhone2, setEmergencyPhone2] = useState('9841234568');
  const [editingContacts, setEditingContacts] = useState(false);

  const helplines = [
    { title: 'Nepal Police Emergency', number: '100', icon: 'police-badge', color: COLORS.danger },
    { title: 'Ambulance / Medical', number: '102', icon: 'ambulance', color: COLORS.warning },
    { title: 'Traffic Police Helpline', number: '103', icon: 'car-emergency', color: COLORS.info },
    { title: 'Highway Emergency Rescue', number: '112', icon: 'shield-car', color: COLORS.primary },
    { title: 'Platform 24/7 Safety Desk', number: '+977-1-4455667', icon: 'headset', color: COLORS.success },
  ];

  const callNumber = (num) => {
    Linking.openURL(`tel:${num}`).catch(() => {
      Alert.alert(t('error'), `Unable to dial ${num}`);
    });
  };

  const saveContacts = () => {
    setEditingContacts(false);
    Alert.alert(t('success'), 'Emergency contacts updated successfully.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('safetyCenter')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* SOS Emergency Banner */}
        <View style={styles.sosCard}>
          <MaterialCommunityIcons name="shield-alert-outline" size={48} color={COLORS.danger} />
          <Text style={styles.sosTitle}>{t('emergencySos')}</Text>
          <Text style={styles.sosSub}>
            Press the button below in case of any security threat, accident, or immediate emergency during your shift.
          </Text>

          <TouchableOpacity
            style={styles.sosTriggerBtn}
            onPress={() => setSosModalVisible(true)}
          >
            <MaterialCommunityIcons name="alert-octagon" size={24} color={COLORS.white} />
            <Text style={styles.sosTriggerText}>{t('triggerSos')}</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Helplines */}
        <Text style={styles.sectionHeading}>{t('emergencyHelplines')}</Text>
        {helplines.map((h, i) => (
          <TouchableOpacity
            key={i}
            style={styles.helplineCard}
            onPress={() => callNumber(h.number)}
          >
            <View style={[styles.helplineIcon, { backgroundColor: h.color + '20' }]}>
              <MaterialCommunityIcons name={h.icon} size={22} color={h.color} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.m }}>
              <Text style={styles.helplineTitle}>{h.title}</Text>
              <Text style={styles.helplineNumber}>{h.number}</Text>
            </View>
            <MaterialCommunityIcons name="phone" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ))}

        {/* Driver Emergency Contacts */}
        <View style={styles.contactsCard}>
          <View style={styles.contactsHeader}>
            <Text style={styles.contactsTitle}>Trusted Personal Contacts</Text>
            <TouchableOpacity onPress={() => (editingContacts ? saveContacts() : setEditingContacts(true))}>
              <Text style={styles.editBtnText}>{editingContacts ? t('save') : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {editingContacts ? (
            <View style={{ marginTop: SPACING.s }}>
              <Text style={styles.inputLabel}>Primary Contact Phone</Text>
              <TextInput
                style={styles.input}
                value={emergencyPhone1}
                onChangeText={setEmergencyPhone1}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputLabel}>Secondary Contact Phone</Text>
              <TextInput
                style={styles.input}
                value={emergencyPhone2}
                onChangeText={setEmergencyPhone2}
                keyboardType="phone-pad"
              />
            </View>
          ) : (
            <View style={{ marginTop: SPACING.s }}>
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => callNumber(emergencyPhone1)}
              >
                <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.primary} />
                <Text style={styles.contactText}>Family / Contact 1: {emergencyPhone1}</Text>
                <MaterialCommunityIcons name="phone" size={18} color={COLORS.success} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => callNumber(emergencyPhone2)}
              >
                <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.primary} />
                <Text style={styles.contactText}>Family / Contact 2: {emergencyPhone2}</Text>
                <MaterialCommunityIcons name="phone" size={18} color={COLORS.success} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Safety SOS Modal */}
      <SafetySOSModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.s,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  sosCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger + '50',
    marginBottom: SPACING.l,
    ...SHADOWS.card,
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.danger,
    marginTop: SPACING.s,
  },
  sosSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.s,
    lineHeight: 18,
  },
  sosTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.m,
    gap: 8,
    marginTop: SPACING.xs,
  },
  sosTriggerText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.m,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  helplineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  helplineNumber: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  contactsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.m,
    ...SHADOWS.card,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.s,
    gap: 8,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.s,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.s,
  },
});
