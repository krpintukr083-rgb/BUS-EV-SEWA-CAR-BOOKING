import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const CountdownTimer = ({ initialSeconds = 45, onExpire }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      if (onExpire) onExpire();
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  const percent = Math.max(0, (seconds / initialSeconds) * 100);
  const isLow = seconds <= 10;

  return (
    <View style={[styles.container, isLow && styles.containerLow]}>
      <Text style={[styles.timerText, isLow && styles.timerTextLow]}>
        {seconds}s
      </Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: isLow ? COLORS.danger : COLORS.warning }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  containerLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.warning
  },
  timerTextLow: {
    color: COLORS.danger
  },
  progressBar: {
    width: 36,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%'
  }
});

export default CountdownTimer;
