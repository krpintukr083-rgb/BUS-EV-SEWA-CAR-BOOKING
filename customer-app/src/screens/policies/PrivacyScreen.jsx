import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../../components/Header';
import { COLORS } from '../../constants/colors';

const PrivacyScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Header title="Privacy Policy" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.heading}>1. Data Collection</Text>
          <Text style={styles.paragraph}>
            We collect personal information necessary for transportation reservations, including your name, verified phone number, email address, passenger age, gender, and pickup/drop location details.
          </Text>

          <Text style={styles.heading}>2. Purpose of Processing</Text>
          <Text style={styles.paragraph}>
            Your data is used solely to generate digital boarding passes, process booking payments, transmit operational notifications, and manage emergency transit insurance coverage records.
          </Text>

          <Text style={styles.heading}>3. Sharing with Transport Operators</Text>
          <Text style={styles.paragraph}>
            Essential passenger details (passenger name, contact number, pickup point) are securely shared with assigned commercial drivers or bus operators exclusively for trip fulfillment.
          </Text>

          <Text style={styles.heading}>4. Payment Security</Text>
          <Text style={styles.paragraph}>
            Payment card and banking credentials are never stored on our application servers. All monetary transactions are processed through encrypted PCI-DSS compliant banking gateways.
          </Text>

          <Text style={styles.heading}>5. Data Retention & User Rights</Text>
          <Text style={styles.paragraph}>
            You retain the right to review your customer profile information, request booking history exports, or request account closure at any time through our customer support desk.
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

export default PrivacyScreen;
