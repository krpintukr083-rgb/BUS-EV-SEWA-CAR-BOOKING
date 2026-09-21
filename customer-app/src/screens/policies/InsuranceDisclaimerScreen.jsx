import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { COLORS } from '../../constants/colors';

const InsuranceDisclaimerScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Header title="Insurance Disclaimer" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Prominent Statutory Notice Card */}
        <View style={styles.alertCard}>
          <Ionicons name="shield-alert" size={32} color="#b45309" />
          <Text style={styles.alertTitle}>Mandatory Statutory Policy Notice</Text>
          <Text style={styles.statutoryQuote}>
            "Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval."
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>1. Nature of Transit Cover</Text>
          <Text style={styles.paragraph}>
            TravelSewa partners with certified insurance underwriters to provide optional / complimentary passenger transit protection. The stated maximum coverage ceiling of ₹5,00,000 is a theoretical maximum policy limit and does not represent a fixed or guaranteed payout amount.
          </Text>

          <Text style={styles.heading}>2. Claim Admissibility & Approval</Text>
          <Text style={styles.paragraph}>
            All claim settlements, disbursements, and liability assessments are conducted exclusively by the underwriting insurance provider based on verifiable clinical records, police reports, boarding pass authenticity, and terms specified in the Master Insurance Policy.
          </Text>

          <Text style={styles.heading}>3. Exclusions</Text>
          <Text style={styles.paragraph}>
            Coverage is non-applicable in instances of passenger gross negligence, unauthorized route detours, unverified ticket holders, pre-existing physical conditions, or instances occurring outside of the scheduled transit window.
          </Text>

          <Text style={styles.heading}>4. Platform Role</Text>
          <Text style={styles.paragraph}>
            TravelSewa acts purely as a digital facilitator connecting travelers with transportation operators and insurance partners, and does not operate as an insurance underwriter or claim adjudicator.
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
  alertCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    marginBottom: 16
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400e',
    marginTop: 8
  },
  statutoryQuote: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350f',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    fontStyle: 'italic'
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

export default InsuranceDisclaimerScreen;
