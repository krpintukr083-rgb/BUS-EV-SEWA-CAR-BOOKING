import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../state/LanguageContext';
import LanguageModal from './LanguageModal';
import SafetySOSModal from './SafetySOSModal';
import { getEffectiveBaseUrl } from '../services/api';
import { DRIVER_API_BASE_URL } from '../constants/api';

const resolvePhotoUrl = (rawPhotoUrl, baseUrl) => {
  if (!rawPhotoUrl || typeof rawPhotoUrl !== 'string') return null;
  const trimmed = rawPhotoUrl.trim();
  if (!trimmed) return null;

  if (/^(https?:\/\/|data:|file:\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, '/');
  const activeBase = (baseUrl || DRIVER_API_BASE_URL).replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${activeBase}${cleanPath}`;
};

const DriverHeader = ({ navigation, title, showBack = false }) => {
  const { driver, user, isOnline, toggleOnlineStatus } = useAuth();
  const { language, t } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DRIVER_API_BASE_URL);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getEffectiveBaseUrl()
      .then((url) => {
        if (isMounted && url) {
          setBaseUrl(url);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (val) => {
    setIsToggling(true);
    await toggleOnlineStatus(val);
    setIsToggling(false);
  };

  const displayName = driver?.name || user?.name || 'Driver Partner';
  const rawPhoto =
    driver?.profilePhoto ||
    driver?.profileImage ||
    driver?.driverPhoto ||
    driver?.photo ||
    driver?.avatar ||
    driver?.image ||
    driver?.user?.profilePhoto ||
    user?.profilePhoto ||
    user?.profileImage ||
    user?.driverPhoto ||
    user?.photo ||
    user?.avatar ||
    user?.image;

  const resolvedPhotoUrl = resolvePhotoUrl(rawPhoto, baseUrl);

  useEffect(() => {
    setImageError(false);
  }, [rawPhoto, baseUrl]);

  const driverInitial = (displayName.trim().charAt(0) || 'D').toUpperCase();

  const renderAvatar = () => {
    if (resolvedPhotoUrl && !imageError) {
      return (
        <Image
          source={{ uri: resolvedPhotoUrl }}
          style={styles.avatar}
          onError={() => setImageError(true)}
        />
      );
    }
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarInitials}>{driverInitial}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {showBack ? (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          <Image source={require('../assets/logo.png')} style={styles.brandLogoSmall} resizeMode="contain" />
          {title && <Text style={styles.headerTitle}>{title}</Text>}
        </TouchableOpacity>
      ) : (
        <View style={styles.leftRow}>
          <Image source={require('../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
          {renderAvatar()}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
    paddingBottom: 6,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 6
  },
  brandLogoSmall: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginLeft: 4,
    marginRight: 4
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  driverInfo: {
    marginLeft: 6,
    flex: 1,
    minWidth: 0
  },
  driverName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0
  },
  actionIconBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  langCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3
  },
  sosText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800'
  },
  switchContainer: {
    marginLeft: 2
  }
});

export default DriverHeader;
