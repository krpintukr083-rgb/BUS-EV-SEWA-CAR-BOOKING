import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { useLanguage } from '../state/LanguageContext';
import { driverService } from '../services/driverService';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' }
];

const LanguageModal = ({ visible, onClose }) => {
  const { language, changeLanguage, t } = useLanguage();

  const selectLang = async (code) => {
    await changeLanguage(code);
    try {
      await driverService.updateLanguage(code);
    } catch (e) {
      // ignore
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('language')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {LANGUAGES.map((item) => {
            const isSelected = language === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.langOption, isSelected && styles.selectedOption]}
                onPress={() => selectLang(item.code)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={[styles.langLabel, isSelected && styles.selectedText]}>{item.native}</Text>
                  <Text style={styles.langSub}>{item.label}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceLight
  },
  selectedOption: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(10, 102, 194, 0.15)'
  },
  langLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  langSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  selectedText: {
    color: COLORS.primary
  }
});

export default LanguageModal;
