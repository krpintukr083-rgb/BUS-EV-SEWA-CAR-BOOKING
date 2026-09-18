import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../state/LanguageContext';
import LanguageModal from './LanguageModal';
import SafetySOSModal from './SafetySOSModal';

const DriverHeader = ({ navigation, title, showBack = false }) => {
  const { driver, user, isOnline, toggleOnlineStatus } = useAuth();
  const { language, t } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (val) => {
    setIsToggling(true);
    await toggleOnlineStatus(val);
    setIsToggling(false);
  };

  const displayName = driver?.name || user?.name || 'Driver Partner';
  const profilePhoto = driver?.profilePhoto || user?.profilePhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80';

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          {title && <Text style={styles.headerTitle}>{title}</Text>}
        </TouchableOpacity>
      ) : (
        <View style={styles.leftRow}>
          <Image source={{ uri: profilePhoto }} style={styles.avatar} />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName} numberOfLines={1}>{displayName}</Text>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? COLORS.online : COLORS.offline }]} />
              <Text style={[styles.statusText, { color: isOnline ? COLORS.online : COLORS.textMuted }]}>
                {isOnline ? t('online') : t('offline')}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.rightActions}>
        {/* Language Selector */}
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.langCode}>{language.toUpperCase()}</Text>
        </TouchableOpacity>

        {/* SOS Emergency Trigger */}
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => setSosModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="warning" size={16} color="#FFF" />
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>

        {/* Online / Offline Switch */}
        {!showBack && (
          <View style={styles.switchContainer}>
            <Switch
              value={isOnline}
              onValueChange={handleToggle}
              disabled={isToggling}
              trackColor={{ false: COLORS.surfaceLight, true: 'rgba(16, 185, 129, 0.4)' }}
              thumbColor={isOnline ? COLORS.online : COLORS.textMuted}
            />
          </View>
        )}
      </View>

      <LanguageModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />
      <SafetySOSModal visible={sosModalVisible} onClose={() => setSosModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  driverInfo: {
    marginLeft: SPACING.sm,
    flex: 1
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  actionIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  langCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4
  },
  sosText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800'
  },
  switchContainer: {
    marginLeft: 4
  }
});

export default DriverHeader;
