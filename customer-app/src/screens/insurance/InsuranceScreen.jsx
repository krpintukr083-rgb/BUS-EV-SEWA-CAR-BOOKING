import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import StatusBadge from '../../components/StatusBadge';
import { COLORS } from '../../constants/colors';

const InsuranceScreen = ({ navigation }) => {
  const { customer } = useCustomerAuth();
  const [insurance, setInsurance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsurance = async () => {
      try {
        const res = await customerService.getInsuranceInfo();
        if (res.success && res.data) {
          setInsurance(res.data);
        }
      } catch (err) {
        console.log('Error fetching insurance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsurance();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Insurance Information" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Protection Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.shieldIcon}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.bannerTitle}>Complimentary Passenger Protection</Text>
          <Text style={styles.bannerSub}>
            All confirmed journeys booked on TravelEase are covered under transit passenger accident protection policy.
          </Text>
        </View>

        {/* Policy Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Policy Coverage Record</Text>
            <StatusBadge status="Active" text="Cover Active" />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Policy Holder</Text>
            <Text style={styles.val}>{customer?.name || 'Customer'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Insured Policy No.</Text>
            <Text style={styles.valBold}>
              {insurance?.policyNumber || 'POL-TRV-2026-98124'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Underwriting Provider</Text>
            <Text style={styles.val}>
              {insurance?.insuranceProvider || 'National General Insurance Co.'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Applicable Coverage</Text>
            <Text style={styles.valCoverage}>
              {insurance?.coverageAmount || 'Up to ₹5,00,000 max limit'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Claim Filing Status</Text>
            <Text style={[styles.val, { color: COLORS.primary, fontWeight: '700' }]}>
              {insurance?.claimStatus || 'No Open Claims'}
            </Text>
          </View>
        </View>

        {/* STATUTORY DISCLAIMER - MANDATORY REQUIREMENT */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle" size={20} color="#b45309" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.disclaimerHeading}>Statutory Policy Notice</Text>
            <Text style={styles.disclaimerText}>
              "Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval."
            </Text>
          </View>
        </View>

        {/* What is covered */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Key Policy Inclusions</Text>
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.bulletText}>Accidental injury medical reimbursement during transit</Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.bulletText}>Emergency hospitalization assistance for registered travelers</Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.bulletText}>Valid only for verified boarding ticket passengers</Text>
          </View>
        </View>

        {/* Link to Full Terms */}
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate('InsuranceDisclaimer')}
        >
          <Text style={styles.linkText}>View Detailed Insurance Terms & Exclusion Rules</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
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
  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  shieldIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy,
    textAlign: 'center'
  },
  bannerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  val: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkNavy
  },
  valBold: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  valCoverage: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16
  },
  disclaimerHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e'
  },
  disclaimerText: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 3,
    lineHeight: 16,
    fontStyle: 'italic'
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 10
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  bulletText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    flex: 1
  },
  linkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  }
});

export default InsuranceScreen;
