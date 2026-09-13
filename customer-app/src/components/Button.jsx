import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';

const Button = ({ title, onPress, variant = 'primary', loading = false, disabled = false, style, textStyle }) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        isPrimary && styles.primaryBtn,
        isOutline && styles.outlineBtn,
        isDanger && styles.dangerBtn,
        (disabled || loading) && styles.disabledBtn,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isOutline ? COLORS.primary : '#ffffff'} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            isOutline && styles.outlineText,
            isDanger && styles.dangerText,
            disabled && styles.disabledText,
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  primaryBtn: {
    backgroundColor: COLORS.primary
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  dangerBtn: {
    backgroundColor: COLORS.danger
  },
  disabledBtn: {
    backgroundColor: '#cbd5e1',
    borderColor: '#cbd5e1'
  },
  text: {
    fontSize: 16,
    fontWeight: '700'
  },
  primaryText: {
    color: '#ffffff'
  },
  outlineText: {
    color: COLORS.primary
  },
  dangerText: {
    color: '#ffffff'
  },
  disabledText: {
    color: '#64748b'
  }
});

export default Button;
