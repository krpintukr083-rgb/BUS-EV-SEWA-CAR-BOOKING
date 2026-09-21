import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../../components/Header';
import { COLORS } from '../../constants/colors';

const TermsScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Header title="Terms & Conditions" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.heading}>1. User Agreement</Text>
          <Text style={styles.paragraph}>
            By accessing or using the TravelSewa Platform for booking Bus, EV-Sewa, or Car transportation services, you agree to comply with and be bound by these Terms and Conditions.
          </Text>

          <Text style={styles.heading}>2. Booking & Ticketing</Text>
          <Text style={styles.paragraph}>
            All reservations made through the customer application are subject to vehicle availability and schedule confirmation. A digital ticket and booking reference ID will be generated upon successful payment.
          </Text>

          <Text style={styles.heading}>3. Passenger Responsibilities</Text>
          <Text style={styles.paragraph}>
            Passengers must carry a valid government-issued photo identification during travel and report to the designated pickup/boarding point at least 15 minutes prior to the scheduled departure.
          </Text>

          <Text style={styles.heading}>4. Fare & Charges</Text>
          <Text style={styles.paragraph}>
            Fares displayed during booking are comprehensive and include statutory vehicle permits and platform booking processing. Additional optional services or customized outstation route deviations may incur supplemental charges.
          </Text>

          <Text style={styles.heading}>5. Service Modifications</Text>
          <Text style={styles.paragraph}>
            TravelSewa reserves the right to adjust schedules, assign replacement vehicles of equivalent category, or modify operating routes in response to weather, regulatory advisories, or road conditions.
          </Text>

          <Text style={styles.heading}>6. Governing Law</Text>
          <Text style={styles.paragraph}>
            These terms are governed in accordance with the laws of India. Any disputes arising in connection with transport services shall be subject to the exclusive jurisdiction of the competent courts of New Delhi.
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

export default TermsScreen;
