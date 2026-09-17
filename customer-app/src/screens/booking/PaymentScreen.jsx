import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const PaymentScreen = ({ route, navigation }) => {
  const { bookingId, bookingCode, amount } = route.params || {};
  const { bookingDraft, updateDraft } = useBooking();

  const [selectedMethod, setSelectedMethod] = useState('Razorpay_UPI');
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'processing' | 'success' | 'failed'
  const [transactionId, setTransactionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);

  const paymentOptions = [
    {
      id: 'Razorpay_UPI',
      title: 'UPI / QR Payment (Razorpay TEST)',
      subtitle: 'Google Pay, PhonePe, Paytm, BHIM UPI',
      icon: 'phone-portrait-outline',
      color: '#10b981'
    },
    {
      id: 'Razorpay_Card',
      title: 'Credit / Debit Card (Razorpay TEST)',
      subtitle: 'Visa, MasterCard, RuPay, Maestro',
      icon: 'card-outline',
      color: '#1d4ed8'
    },
    {
      id: 'Razorpay_NetBanking',
      title: 'Net Banking (Razorpay TEST)',
      subtitle: 'SBI, HDFC, ICICI, Axis & 50+ Banks',
      icon: 'business-outline',
      color: '#6366f1'
    }
  ];

  // Initiate Razorpay Checkout
  const handleInitiateRazorpay = async () => {
    setPaymentState('processing');
    setErrorMessage('');

    try {
      const activeBookingId = bookingId || bookingCode || bookingDraft.confirmedBooking?._id || bookingDraft.confirmedBooking?.bookingId;
      if (!activeBookingId) {
        throw new Error('No active booking ID found to initialize payment.');
      }

      // Step 1: Create Razorpay Order on server (server calculates & verifies amount)
      const orderRes = await customerService.createRazorpayOrder(activeBookingId);

      if (orderRes.success && orderRes.data) {
        setRazorpayOrder(orderRes.data);
        setPaymentState('idle');
        setShowRazorpayModal(true);
      } else {
        setPaymentState('failed');
        setErrorMessage(orderRes.message || 'Failed to create Razorpay test order.');
      }
    } catch (err) {
      console.log('Razorpay order initiation error:', err);
      setPaymentState('failed');
      setErrorMessage(err.response?.data?.message || err.message || 'Error connecting to payment provider.');
    }
  };

  // Process Webhook / Return Message from Razorpay WebView Checkout
  const handleWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setShowRazorpayModal(false);

      if (data.type === 'PAYMENT_SUCCESS') {
        setPaymentState('processing');
        // Step 2: Server-side HMAC SHA256 Signature Verification
        const verifyRes = await customerService.verifyRazorpayPayment({
          bookingId: razorpayOrder.bookingId || razorpayOrder.bookingDbId,
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: data.razorpayPaymentId,
          razorpaySignature: data.razorpaySignature
        });

        if (verifyRes.success && verifyRes.data) {
          setTransactionId(data.razorpayPaymentId);
          setPaymentState('success');
          updateDraft({ confirmedBooking: verifyRes.data.booking });

          setTimeout(() => {
            navigation.replace('BookingConfirmation', {
              booking: verifyRes.data.booking,
              payment: verifyRes.data.payment
            });
          }, 1200);
        } else {
          setPaymentState('failed');
          setErrorMessage(verifyRes.message || 'Payment signature verification failed on server.');
        }
      } else if (data.type === 'PAYMENT_FAILURE' || data.type === 'PAYMENT_CANCELLED') {
        setPaymentState('failed');
        const desc = data.error?.description || 'Payment was cancelled or declined in test mode.';
        setErrorMessage(desc);

        // Record failure in backend
        await customerService.recordRazorpayFailure({
          bookingId: razorpayOrder.bookingId || razorpayOrder.bookingDbId,
          razorpayOrderId: razorpayOrder.orderId,
          error: data.error
        });
      }
    } catch (err) {
      console.log('Error handling Razorpay response:', err);
      setShowRazorpayModal(false);
      setPaymentState('failed');
      setErrorMessage('Unexpected response during payment processing.');
    }
  };

  // Direct Sandbox Test Simulation (for instant automated test simulation)
  const handleSimulatePayment = async (forceFailure = false) => {
    setPaymentState('processing');
    setErrorMessage('');

    try {
      const activeBookingId = bookingId || bookingCode || bookingDraft.confirmedBooking?._id || bookingDraft.confirmedBooking?.bookingId;

      if (forceFailure) {
        const res = await customerService.testPaymentFailure(activeBookingId, 'Card declined by issuing bank (Test Simulation)');
        setPaymentState('failed');
        setErrorMessage(res?.message || 'Payment declined in test simulation.');
      } else {
        const orderRes = await customerService.createRazorpayOrder(activeBookingId);
        if (!orderRes.success || !orderRes.data) {
          throw new Error('Failed to create order on server');
        }

        const testOrderId = orderRes.data.orderId;
        const testPaymentId = `pay_test_${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
        
        // Use test-success verified endpoint or server verify
        const res = await customerService.testPaymentSuccess(activeBookingId, selectedMethod);

        if (res && res.success) {
          setTransactionId(res.data.transactionId || testPaymentId);
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
          setErrorMessage(res?.message || 'Payment simulation failed.');
        }
      }
    } catch (err) {
      console.log('Payment simulation error:', err);
      setPaymentState('failed');
      setErrorMessage(err.response?.data?.message || err.message || 'Payment failed in test sandbox.');
    }
  };

  // HTML content for Razorpay Embedded Checkout WebView
  const getRazorpayHtml = () => {
    if (!razorpayOrder) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #0f172a;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 24px;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #1e293b;
            border-top: 4px solid #10b981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 24px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          h2 { font-size: 18px; margin: 0 0 8px 0; font-weight: 700; color: #f8fafc; }
          p { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5; }
          .badge {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-top: 16px;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Opening Razorpay TEST Checkout...</h2>
        <p>Complete your test payment in the modal window.</p>
        <div class="badge">⚡ Razorpay TEST Mode</div>

        <script>
          setTimeout(function() {
            var options = {
              key: "${razorpayOrder.keyId}",
              amount: "${razorpayOrder.amount}",
              currency: "${razorpayOrder.currency || 'INR'}",
              name: "TravelEase Mobility",
              description: "Booking ${razorpayOrder.bookingId} (${razorpayOrder.serviceType || 'Transit'})",
              image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=200&q=80",
              order_id: "${razorpayOrder.orderId}",
              prefill: {
                name: "${razorpayOrder.customer?.name || 'Traveler'}",
                email: "${razorpayOrder.customer?.email || 'customer@example.com'}",
                contact: "${razorpayOrder.customer?.phone || '+919999999999'}"
              },
              theme: {
                color: "#1d4ed8"
              },
              modal: {
                ondismiss: function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PAYMENT_CANCELLED',
                    error: { description: 'Razorpay checkout cancelled by customer' }
                  }));
                }
              },
              handler: function (response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PAYMENT_SUCCESS',
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature
                }));
              }
            };

            var rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response){
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAYMENT_FAILURE',
                error: response.error
              }));
            });
            rzp.open();
          }, 300);
        </script>
      </body>
      </html>
    `;
  };

  if (paymentState === 'processing') {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size={54} color={COLORS.primary} />
        <Text style={styles.stateTitle}>Verifying Payment with Razorpay...</Text>
        <Text style={styles.stateSub}>Validating HMAC SHA256 security signature server-side. Please do not close the app.</Text>
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
          <Text style={styles.securityText}>Server-Side Signature Verification Active</Text>
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
        <Text style={styles.stateTitle}>Razorpay Payment Verified!</Text>
        <Text style={styles.stateSub}>Payment ID: {transactionId}</Text>
        <Text style={styles.redirectText}>Confirming your booking ticket...</Text>
      </View>
    );
  }

  const finalPayable = amount || bookingDraft.totalFare || 0;

  return (
    <View style={styles.container}>
      <Header title="Payment & Checkout" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Payable Header Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountHeaderRow}>
            <View style={styles.testModeBadge}>
              <Ionicons name="flash" size={12} color="#10b981" />
              <Text style={styles.testModeText}>RAZORPAY TEST MODE</Text>
            </View>
            <Text style={styles.bookingRefText}>Ref: {bookingCode || bookingId || 'BK-PENDING'}</Text>
          </View>
          <Text style={styles.amountLabel}>Total Amount Payable</Text>
          <Text style={styles.amountValue}>₹{finalPayable}</Text>
          <Text style={styles.fareInclusiveText}>Inclusive of all transit taxes and safety compliance</Text>
        </View>

        {/* Booking Details Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.darkNavy} />
            <Text style={styles.summaryTitle}>Trip Details</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Mode</Text>
            <Text style={styles.summaryVal}>{bookingDraft.serviceType || 'Transportation'}</Text>
          </View>

          {bookingDraft.vehicle && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vehicle</Text>
              <Text style={styles.summaryVal} numberOfLines={1}>
                {bookingDraft.vehicle.vehicleName || bookingDraft.vehicle.busName || 'Express Shuttle'}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pickup</Text>
            <Text style={styles.summaryVal} numberOfLines={1}>
              {bookingDraft.pickupLocation || 'Pickup Terminal'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Drop-off</Text>
            <Text style={styles.summaryVal} numberOfLines={1}>
              {bookingDraft.dropLocation || 'Destination Terminal'}
            </Text>
          </View>

          {bookingDraft.selectedSeats && bookingDraft.selectedSeats.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Seat(s)</Text>
              <Text style={styles.summaryVal}>{bookingDraft.selectedSeats.join(', ')}</Text>
            </View>
          )}

          {bookingDraft.passengerDetails && bookingDraft.passengerDetails[0]?.name ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passenger</Text>
              <Text style={styles.summaryVal}>{bookingDraft.passengerDetails[0].name}</Text>
            </View>
          ) : null}
        </View>

        {/* Failed Error Banner */}
        {paymentState === 'failed' && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorTitle}>Payment Failed (Test Sandbox)</Text>
              <Text style={styles.errorDesc}>{errorMessage}</Text>
              <Text style={styles.errorHint}>Your booking remains in Pending state. You can retry anytime.</Text>
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <Text style={styles.sectionHeader}>Select Razorpay Payment Method</Text>

        {paymentOptions.map((option) => (
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

        {/* Security Guarantee */}
        <View style={styles.guaranteeBox}>
          <Ionicons name="shield-checkmark" size={18} color="#059669" />
          <Text style={styles.guaranteeText}>
            Razorpay Test Mode — 256-bit encrypted test gateway with HMAC SHA-256 server verification.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Action Footer */}
      <View style={styles.footer}>
        <Button
          title={`Pay ₹${finalPayable} (Razorpay Checkout)`}
          onPress={handleInitiateRazorpay}
          style={{ backgroundColor: '#059669', marginBottom: 10 }}
        />

        <View style={styles.simButtonsRow}>
          <TouchableOpacity
            style={styles.simSuccessBtn}
            onPress={() => handleSimulatePayment(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.simSuccessText}>⚡ Instant Test Success</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.simFailBtn}
            onPress={() => handleSimulatePayment(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.simFailText}>❌ Test Failure</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Razorpay WebView Checkout Modal */}
      <Modal
        visible={showRazorpayModal}
        animationType="slide"
        onRequestClose={() => setShowRazorpayModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="card" size={20} color="#ffffff" />
              <Text style={styles.modalTitle}>Razorpay TEST Checkout</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowRazorpayModal(false);
                setPaymentState('failed');
                setErrorMessage('Payment cancelled by user');
              }}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <WebView
            originWhitelist={['*']}
            source={{ html: getRazorpayHtml() }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.webviewLoadingText}>Loading Razorpay Gateway...</Text>
              </View>
            )}
          />
        </View>
      </Modal>
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
    paddingBottom: 150
  },
  amountCard: {
    backgroundColor: COLORS.darkNavy,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  testModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981'
  },
  testModeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800'
  },
  bookingRefText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  amountLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  amountValue: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4
  },
  fareInclusiveText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkNavy,
    maxWidth: '65%'
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 10
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0'
  },
  selectedMethodCard: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5'
  },
  methodIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  methodInfo: {
    flex: 1
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
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
    borderColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669'
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 10,
    marginTop: 6
  },
  guaranteeText: {
    fontSize: 11,
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
    alignItems: 'flex-start'
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger
  },
  errorDesc: {
    fontSize: 12,
    color: '#7f1d1d',
    marginTop: 2
  },
  errorHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 8
  },
  simSuccessBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  simSuccessText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '700'
  },
  simFailBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  simFailText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700'
  },
  stateContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy,
    marginTop: 20
  },
  stateSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18
  },
  redirectText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 16,
    fontWeight: '700'
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  securityText: {
    fontSize: 11,
    color: '#166534',
    marginLeft: 6,
    fontWeight: '600'
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.darkNavy
  },
  modalHeader: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  modalCloseBtn: {
    padding: 4
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a'
  },
  webviewLoadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13
  }
});

export default PaymentScreen;

