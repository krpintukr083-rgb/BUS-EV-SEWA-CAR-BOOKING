import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const Header = ({ title, onBack, rightAction, rightIcon }) => {
  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.content}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {rightAction && rightIcon ? (
          <TouchableOpacity onPress={rightAction} style={styles.rightButton}>
            <Ionicons name={rightIcon} size={22} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.primary,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1
  },
  rightButton: {
    padding: 4
  }
});

export default Header;
