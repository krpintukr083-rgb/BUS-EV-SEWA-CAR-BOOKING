import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const QRCodeWidget = ({ code }) => {
  return (
    <View style={styles.container}>
      <View style={styles.qrBox}>
        <Ionicons name="qr-code" size={140} color={COLORS.darkNavy} />
      </View>
      <Text style={styles.codeText}>{code || 'BK-BOARDING-PASS'}</Text>
      <Text style={styles.subText}>Show this digital pass at the boarding gate</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16
  },
  qrBox: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 12,
    letterSpacing: 1
  },
  subText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4
  }
});

export default QRCodeWidget;
