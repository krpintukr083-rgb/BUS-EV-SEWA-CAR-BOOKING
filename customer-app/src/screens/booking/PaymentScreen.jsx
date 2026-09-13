import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const PaymentScreen = ({ route, navigation }) => {
  const { bookingId, bookingCode, amount } = route.params || {};
  const { updateDraft } = useBooking();

  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'processing' | 'success' | 'failed'
  const [transactionId, setTransactionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const paymentOptions = [
    {
      id: 'UPI',
      title: 'UPI / QR Payment (Test Sandbox)',
      subtitle: 'Google Pay, PhonePe, Paytm, BHIM',
      icon: 'phone-portrait-outline',
      color: '#10b981'
    },
    {
      id: 'Card',
      title: 'Credit / Debit Card (Test Sandbox)',
      subtitle: 'Visa, MasterCard, RuPay, Maestro',
      icon: 'card-outline',
      color: '#1d4ed8'
    },
    {
      id: 'NetBanking',
      title: 'Net Banking (Test Sandbox)',
      subtitle: 'All Major Indian Banks',
      icon: 'business-outline',
      color: '#6366f1'
    }
  ];

  const handlePayNow = async (forceFailure = false) => {
    setPaymentState('processing');
    setErrorMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      let res;
      if (forceFailure) {
        res = await customerService.testPaymentFailure(bookingId || bookingCode, 'Bank test transaction declined by user');
      } else {
        res = await customerService.testPaymentSuccess(bookingId || bookingCode, selectedMethod);
      }

      if (res && res.success) {
        setTransactionId(res.data.transactionId);
        setPaymentState('success');
        updateDraft({ confirmedBooking: res.data.booking });

        setTimeout(() => {
          navigation.replace('BookingConfirmation', {
            booking: res.data.booking,
            payment: res.data.payment
          });
        }, 1200);
      } else {
        setPaymentState('failed');
        setErrorMessage(res?.message || 'Payment simulation failed in test sandbox.');
      }
    } catch (err) {
      console.log('Payment processing error:', err);
      setPaymentState('failed');
      setErrorMessage(err.response?.data?.message || 'Payment authorization failed. Please try again.');
    }
  };

  if (paymentState === 'processing') {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size={54} color={COLORS.primary} />
        <Text style={styles.stateTitle}>Processing Sandbox Payment...</Text>
        <Text style={styles.stateSub}>Contacting mock bank gateway. Please do not close the app.</Text>
        <View style={styles.securityBadge}>
          <Ionicons name="lock-closed" size={14} color={COLORS.success} />
          <Text style={styles.securityText}>256-Bit SSL Mock Gateway Sandbox</Text>
        </View>
      </View>
    );
  }

  if (paymentState === 'success') {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={44} color="#ffffff" />
        </View>
        <Text style={styles.stateTitle}>Payment Successful!</Text>
        <Text style={styles.stateSub}>Transaction ID: {transactionId}</Text>
        <Text style={styles.redirectText}>Redirecting to Booking Confirmation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Payment Gateway Sandbox" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Payable Header Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount Payable (Test)</Text>
          <Text style={styles.amountValue}>₹{amount || 0}</Text>
          <Text style={styles.bookingRef}>Ref: {bookingCode || bookingId}</Text>
          <View style={styles.sandboxBadge}>
            <Text style={styles.sandboxText}>MOCK PAYMENT PIPELINE</Text>
          </View>
        </View>

        {/* Failed Error Banner */}
        {paymentState === 'failed' && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.errorTitle}>Payment Failed (Test Sandbox)</Text>
              <Text style={styles.errorDesc}>{errorMessage}</Text>
              <Text style={styles.errorHint}>Booking remains in Pending state.</Text>
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <Text style={styles.sectionHeader}>Select Sandbox Payment Method</Text>

        {paymentOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.methodCard,
              selectedMethod === option.id && styles.selectedMethodCard
            ]}
            onPress={() => setSelectedMethod(option.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIconBox, { backgroundColor: option.color + '15' }]}>
              <Ionicons name={option.icon} size={22} color={option.color} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{option.title}</Text>
              <Text style={styles.methodSub}>{option.subtitle}</Text>
            </View>
            <View style={styles.radioOuter}>
              {selectedMethod === option.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Secure Guarantee */}
        <View style={styles.guaranteeBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.success} />
          <Text style={styles.guaranteeText}>
            Development Sandbox — No real money will be charged.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <Button
          title={`Pay ₹${amount || 0} (Test Success)`}
          onPress={() => handlePayNow(false)}
          style={{ backgroundColor: COLORS.success, marginBottom: 8 }}
        />
        <TouchableOpacity
          style={styles.failButton}
          onPress={() => handlePayNow(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.failButtonText}>Simulate Payment Failure</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 120
  },
  amountCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  amountLabel: {
    color: '#bfdbfe',
    fontSize: 12,
    fontWeight: '600'
  },
  amountValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4
  },
  bookingRef: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 4
  },
  sandboxBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8
  },
  sandboxText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0'
  },
  selectedMethodCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff'
  },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  methodInfo: {
    flex: 1
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  },
  methodSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 10,
    marginTop: 10
  },
  guaranteeText: {
    fontSize: 12,
    color: '#166534',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500'
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center'
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger
  },
  errorDesc: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 2
  },
  errorHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 8
  },
  failButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger
  },
  failButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600'
  },
  stateContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 20
  },
  stateSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8
  },
  redirectText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 16,
    fontWeight: '600'
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  securityText: {
    fontSize: 11,
    color: COLORS.success,
    marginLeft: 6,
    fontWeight: '600'
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  }
});

export default PaymentScreen;
