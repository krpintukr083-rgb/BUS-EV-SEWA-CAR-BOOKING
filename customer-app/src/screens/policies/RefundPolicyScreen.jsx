import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../../components/Header';
import { COLORS } from '../../constants/colors';

const RefundPolicyScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Header title="Refund / Cancellation Policy" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.heading}>1. Cancellation Window & Charges</Text>
          <Text style={styles.paragraph}>
            • Cancellation more than 24 hours prior to departure: 90% Refund (10% nominal platform processing fee).{'\n'}
            • Cancellation 12 - 24 hours prior to departure: 75% Refund.{'\n'}
            • Cancellation 2 - 12 hours prior to departure: 50% Refund.{'\n'}
            • Cancellation less than 2 hours or post departure: Non-refundable.
          </Text>

          <Text style={styles.heading}>2. Refund Initiation & Timelines</Text>
          <Text style={styles.paragraph}>
            Upon successful cancellation through the app, the approved refund amount is initiated automatically to the original source of payment (UPI, Credit/Debit card, or Net Banking account) within 24 to 48 banking business hours.
          </Text>

          <Text style={styles.heading}>3. Service Disruptions & Operator Cancellations</Text>
          <Text style={styles.paragraph}>
            If a scheduled bus trip, EV-Sewa route, or car service is cancelled by the operator due to technical issues, breakdown, or administrative reasons, passengers are entitled to a 100% full refund without deduction.
          </Text>

          <Text style={styles.heading}>4. Dispute Resolution</Text>
          <Text style={styles.paragraph}>
            For any discrepancies regarding refund calculations, please contact customer support with your Booking Reference ID at support@travelsewa.com.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  heading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkNavy,
    marginTop: 14,
    marginBottom: 6
  },
  paragraph: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 20
  }
});

export default RefundPolicyScreen;
