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
  const { bookingId, bookingCode, bookingMode, amount } = route.params || {};
  const { bookingDraft, updateDraft } = useBooking();

  const isInstantBooking =
    bookingMode === 'INSTANT' || bookingDraft.confirmedBooking?.bookingMode === 'INSTANT';
  const [selectedMethod, setSelectedMethod] = useState('Offline_Cash');
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'processing' | 'success' | 'failed'
  const [transactionId, setTransactionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);

  const paymentOptions = [
    {
      id: 'Offline_Cash',
      title: 'Offline Cash (Pay on Boarding)',
      subtitle: 'Pay the fare in cash directly to the assigned driver / conductor',
      icon: 'cash-outline',
      color: '#059669',
      isOffline: true,
      isUpcoming: false
    },
    {
      id: 'Razorpay_UPI',
      title: 'UPI / QR Payment',
      subtitle: 'Google Pay, PhonePe, Paytm, BHIM UPI',
      icon: 'phone-portrait-outline',
      color: '#64748b',
      isOffline: false,
      isUpcoming: true
    },
    {
      id: 'Razorpay_Card',
      title: 'Credit / Debit Card',
      subtitle: 'Visa, MasterCard, RuPay, Maestro',
      icon: 'card-outline',
      color: '#64748b',
      isOffline: false,
      isUpcoming: true
    },
    {
      id: 'Razorpay_NetBanking',
      title: 'Net Banking',
      subtitle: 'SBI, HDFC, ICICI, Axis & 50+ Banks',
      icon: 'business-outline',
      color: '#64748b',
      isOffline: false,
      isUpcoming: true
    }
  ];
  const visiblePaymentOptions = paymentOptions;

  // Confirm Offline Cash Booking
  const handleConfirmOfflineCash = async () => {
    setPaymentState('processing');
    setErrorMessage('');

    try {
      const activeBookingId = bookingId || bookingCode || bookingDraft.confirmedBooking?._id || bookingDraft.confirmedBooking?.bookingId;
      if (!activeBookingId) {
        throw new Error('No active booking ID found to confirm offline cash booking.');
      }

      const res = await customerService.confirmOfflineCashBooking(activeBookingId);
      if (res.success && res.data) {
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
        setErrorMessage(res.message || 'Failed to confirm offline cash booking.');
      }
    } catch (err) {
      console.log('Offline cash booking confirmation error:', err);
      setPaymentState('failed');
      setErrorMessage(err.response?.data?.message || err.message || 'Error confirming offline cash booking.');
    }
  };

  // Simulate Instant Razorpay Payment (for Sandbox testing)
  const handleSimulatePayment = async (shouldFail = false) => {
    try {
      setPaymentState('processing');
      const activeBookingId = bookingId || bookingCode || bookingDraft.confirmedBooking?._id || bookingDraft.confirmedBooking?.bookingId;
      if (!activeBookingId) throw new Error('No booking ID found');

      const orderRes = await customerService.createRazorpayOrder(activeBookingId);
      if (!orderRes.success) throw new Error(orderRes.message || 'Failed to create order');

      const order = orderRes.data;
      if (shouldFail) {
        await customerService.recordRazorpayFailure({
          bookingId: order.bookingId || order.bookingDbId,
          razorpayOrderId: order.orderId,
          error: { description: 'Simulated payment failure for sandbox validation' }
        });
        setPaymentState('failed');
        setErrorMessage('Simulated Razorpay test payment failure');
      } else {
        const authRes = await customerService.processRazorpayTestPay({
          bookingId: order.bookingId || order.bookingDbId,
          razorpayOrderId: order.orderId,
          status: 'success',
          method: selectedMethod
        });
        if (!authRes.success) throw new Error(authRes.message || 'Test pay failed');

        const verifyRes = await customerService.verifyRazorpayPayment({
          bookingId: order.bookingId || order.bookingDbId,
          razorpayOrderId: authRes.data.razorpayOrderId,
          razorpayPaymentId: authRes.data.razorpayPaymentId,
          razorpaySignature: authRes.data.razorpaySignature
        });

        if (verifyRes.success) {
          setTransactionId(authRes.data.razorpayPaymentId);
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
          setErrorMessage(verifyRes.message || 'Signature verification failed');
        }
      }
    } catch (err) {
      setPaymentState('failed');
      setErrorMessage(err.response?.data?.message || err.message || 'Simulation error');
    }
  };

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

      if (data.type === 'TEST_CHECKOUT_AUTHORIZE' || data.type === 'PAYMENT_SUCCESS') {
        setPaymentState('processing');

        const activeBookingId = razorpayOrder.bookingId || razorpayOrder.bookingDbId;
        const activeOrderId = data.razorpayOrderId || razorpayOrder.orderId;

        let authData = {
          razorpayOrderId: activeOrderId,
          razorpayPaymentId: data.razorpayPaymentId,
          razorpaySignature: data.razorpaySignature
        };

        // If from interactive test checkout, request server-side HMAC authorization
        if (data.type === 'TEST_CHECKOUT_AUTHORIZE') {
          const authRes = await customerService.processRazorpayTestPay({
            bookingId: activeBookingId,
            razorpayOrderId: activeOrderId,
            status: data.status || 'success',
            method: data.method || selectedMethod
          });

          if (!authRes.success || !authRes.data) {
            throw new Error(authRes.message || 'Test payment authorization failed on server');
          }

          authData = authRes.data;
        }

        // Step 2: Server-side HMAC SHA256 Signature Verification
        const verifyRes = await customerService.verifyRazorpayPayment({
          bookingId: activeBookingId,
          razorpayOrderId: authData.razorpayOrderId,
          razorpayPaymentId: authData.razorpayPaymentId,
          razorpaySignature: authData.razorpaySignature
        });

        if (verifyRes.success && verifyRes.data) {
          setTransactionId(authData.razorpayPaymentId);
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
          bookingId: razorpayOrder?.bookingId || razorpayOrder?.bookingDbId,
          razorpayOrderId: razorpayOrder?.orderId,
          error: data.error
        });
      }
    } catch (err) {
      console.log('Error handling Razorpay response:', err);
      setShowRazorpayModal(false);
      setPaymentState('failed');
      setErrorMessage(err.response?.data?.message || err.message || 'Unexpected response during payment processing.');
    }
  };

  // HTML content for Razorpay Embedded Checkout WebView
  const getRazorpayHtml = () => {
    if (!razorpayOrder) return '';
    const formattedAmount = (razorpayOrder.amount / 100).toFixed(2);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #0f172a;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .header {
            background: #1e293b;
            padding: 16px 20px;
            border-bottom: 1px solid #334155;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .merchant-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .avatar {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            background: #2563eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
          }
          .brand-name { font-size: 15px; font-weight: 700; color: #f8fafc; }
          .brand-desc { font-size: 11px; color: #94a3b8; margin-top: 2px; }
          .amount-badge {
            text-align: right;
          }
          .amount-val { font-size: 18px; font-weight: 800; color: #10b981; }
          .amount-curr { font-size: 11px; color: #94a3b8; }
          
          .test-banner {
            background: linear-gradient(90deg, #065f46 0%, #047857 100%);
            color: #d1fae5;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #059669;
          }
          .content {
            padding: 16px;
            flex: 1;
            overflow-y: auto;
          }
          .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            background: #1e293b;
            padding: 4px;
            border-radius: 10px;
          }
          .tab {
            flex: 1;
            padding: 10px;
            text-align: center;
            font-size: 13px;
            font-weight: 600;
            color: #94a3b8;
            border-radius: 8px;
            cursor: pointer;
            border: none;
            background: transparent;
          }
          .tab.active {
            background: #2563eb;
            color: #ffffff;
          }
          .panel {
            display: none;
            background: #1e293b;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #334155;
          }
          .panel.active { display: block; }
          .field-label { font-size: 12px; color: #94a3b8; font-weight: 600; margin-bottom: 6px; display: block; }
          .input-box {
            width: 100%;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 12px;
            color: #ffffff;
            font-size: 14px;
            margin-bottom: 14px;
            outline: none;
          }
          .input-box:focus { border-color: #3b82f6; }
          .test-hints {
            background: rgba(37, 99, 235, 0.1);
            border: 1px dashed rgba(59, 130, 246, 0.4);
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 14px;
          }
          .test-hint-title { font-size: 11px; font-weight: 700; color: #60a5fa; margin-bottom: 4px; }
          .test-hint-sub { font-size: 11px; color: #94a3b8; line-height: 1.4; }
          .btn-row {
            display: flex;
            gap: 10px;
            margin-top: 20px;
          }
          .pay-btn {
            width: 100%;
            background: #10b981;
            color: #ffffff;
            border: none;
            border-radius: 10px;
            padding: 14px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          .pay-btn:active { transform: scale(0.98); }
          .cancel-btn {
            width: 100%;
            background: transparent;
            color: #94a3b8;
            border: 1px solid #334155;
            border-radius: 10px;
            padding: 12px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 10px;
          }

          /* Simulator Modal */
          .sim-modal {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            z-index: 999;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .sim-card {
            background: #1e293b;
            border: 1px solid #475569;
            border-radius: 16px;
            padding: 24px;
            width: 100%;
            max-width: 360px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          }
          .sim-icon {
            font-size: 36px;
            margin-bottom: 12px;
          }
          .sim-title { font-size: 17px; font-weight: 700; color: #f8fafc; margin-bottom: 6px; }
          .sim-sub { font-size: 12px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
          .sim-actions { display: flex; flex-direction: column; gap: 10px; }
          .sim-approve {
            background: #10b981;
            color: #ffffff;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }
          .sim-decline {
            background: #ef4444;
            color: #ffffff;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="merchant-info">
            <div class="avatar">⚡</div>
            <div>
              <div class="brand-name">TravelSewa Mobility</div>
              <div class="brand-desc">Booking ${razorpayOrder.bookingId}</div>
            </div>
          </div>
          <div class="amount-badge">
            <div class="amount-val">₹${formattedAmount}</div>
            <div class="amount-curr">TEST MODE</div>
          </div>
        </div>

        <div class="test-banner">
          <span>⚡ RAZORPAY TEST ENVIRONMENT</span>
          <span>INR</span>
        </div>

        <div class="content">
          <div class="tabs">
            <button class="tab active" onclick="setTab('upi')">UPI / QR</button>
            <button class="tab" onclick="setTab('card')">Card</button>
            <button class="tab" onclick="setTab('netbanking')">Net Banking</button>
          </div>

          <!-- UPI Panel -->
          <div id="panel-upi" class="panel active">
            <label class="field-label">Virtual Payment Address (VPA)</label>
            <input type="text" id="upi-id" class="input-box" value="success@razorpay" placeholder="e.g. yourname@upi" />
            <div class="test-hints">
              <div class="test-hint-title">💡 Razorpay Test VPA Guide</div>
              <div class="test-hint-sub">Use <b>success@razorpay</b> for successful authorization, or <b>failure@razorpay</b> to simulate declined transaction.</div>
            </div>
            <button class="pay-btn" onclick="openSim('UPI')">Pay ₹${formattedAmount}</button>
          </div>

          <!-- Card Panel -->
          <div id="panel-card" class="panel">
            <label class="field-label">Card Number</label>
            <input type="text" id="card-no" class="input-box" value="4111 1111 1111 1111" placeholder="Card Number" />
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label class="field-label">Expiry</label>
                <input type="text" class="input-box" value="12/28" placeholder="MM/YY" />
              </div>
              <div style="flex: 1;">
                <label class="field-label">CVV</label>
                <input type="password" class="input-box" value="123" placeholder="CVV" />
              </div>
            </div>
            <div class="test-hints">
              <div class="test-hint-title">💡 Razorpay Test Cards</div>
              <div class="test-hint-sub">Success: <b>4111 1111 1111 1111</b> | Fail: <b>4000 0000 0000 0002</b> (Any CVV/Expiry).</div>
            </div>
            <button class="pay-btn" onclick="openSim('Card')">Pay ₹${formattedAmount}</button>
          </div>

          <!-- Net Banking Panel -->
          <div id="panel-netbanking" class="panel">
            <label class="field-label">Select Bank</label>
            <select id="bank-select" class="input-box" style="background:#0f172a; color:#fff;">
              <option value="HDFC">HDFC Bank (Test)</option>
              <option value="SBI">State Bank of India (Test)</option>
              <option value="ICICI">ICICI Bank (Test)</option>
              <option value="AXIS">Axis Bank (Test)</option>
            </select>
            <button class="pay-btn" onclick="openSim('NetBanking')">Pay ₹${formattedAmount}</button>
          </div>

          <button class="cancel-btn" onclick="cancelPayment()">Cancel Checkout</button>
        </div>

        <!-- 3DS / OTP Simulator Modal -->
        <div id="sim-modal" class="sim-modal">
          <div class="sim-card">
            <div class="sim-icon">🏦</div>
            <div class="sim-title">Razorpay Bank Simulator</div>
            <div class="sim-sub">Testing authentication for ₹${formattedAmount} on Order <b>${razorpayOrder.orderId}</b></div>
            <div class="sim-actions">
              <button class="sim-approve" onclick="confirmPayment('success')">✓ Authorize Payment (Success)</button>
              <button class="sim-decline" onclick="confirmPayment('failed')">✕ Decline Payment (Fail)</button>
            </div>
          </div>
        </div>

        <script>
          var currentMethod = 'UPI';

          function setTab(name) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            if (name === 'upi') {
              document.querySelectorAll('.tab')[0].classList.add('active');
              document.getElementById('panel-upi').classList.add('active');
              currentMethod = 'UPI';
            } else if (name === 'card') {
              document.querySelectorAll('.tab')[1].classList.add('active');
              document.getElementById('panel-card').classList.add('active');
              currentMethod = 'Card';
            } else if (name === 'netbanking') {
              document.querySelectorAll('.tab')[2].classList.add('active');
              document.getElementById('panel-netbanking').classList.add('active');
              currentMethod = 'NetBanking';
            }
          }

          function openSim(method) {
            currentMethod = method;
            document.getElementById('sim-modal').style.display = 'flex';
          }

          function cancelPayment() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAYMENT_CANCELLED',
              error: { description: 'Razorpay checkout cancelled by customer' }
            }));
          }

          function confirmPayment(outcome) {
            document.getElementById('sim-modal').style.display = 'none';

            if (outcome === 'success') {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TEST_CHECKOUT_AUTHORIZE',
                status: 'success',
                method: currentMethod,
                razorpayOrderId: "${razorpayOrder.orderId}"
              }));
            } else {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAYMENT_FAILURE',
                error: {
                  code: 'PAYMENT_DECLINED',
                  description: 'Payment was declined by issuing bank in Razorpay test mode'
                }
              }));
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  if (paymentState === 'processing') {
    const isOffline = selectedMethod === 'Offline_Cash';
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size={54} color={COLORS.primary} />
        <Text style={styles.stateTitle}>
          {isOffline ? 'Confirming Offline Cash Booking...' : 'Verifying Payment with Razorpay...'}
        </Text>
        <Text style={styles.stateSub}>
          {isOffline
            ? 'Reserving your seat(s) and preparing your ticket pass. Please wait a moment...'
            : 'Validating HMAC SHA256 security signature server-side. Please do not close the app.'}
        </Text>
        <View style={styles.securityBadge}>
          <Ionicons name={isOffline ? 'checkmark-circle' : 'shield-checkmark'} size={16} color={COLORS.success} />
          <Text style={styles.securityText}>
            {isOffline ? 'Direct Seat Reservation Active' : 'Server-Side Signature Verification Active'}
          </Text>
        </View>
      </View>
    );
  }

  if (paymentState === 'success') {
    const isOffline = selectedMethod === 'Offline_Cash';
    return (
      <View style={styles.stateContainer}>
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={44} color="#ffffff" />
        </View>
        <Text style={styles.stateTitle}>
          {isOffline ? 'Booking Request Sent!' : 'Payment Verified — Request Sent!'}
        </Text>
        <Text style={styles.stateSub}>
          {isOffline
            ? 'Waiting for assigned driver/conductor confirmation. Pay upon boarding.'
            : 'Payment authorized. Waiting for assigned driver/conductor confirmation.'}
        </Text>
        <Text style={styles.redirectText}>Opening your booking summary...</Text>
      </View>
    );
  }

  const finalPayable = amount || bookingDraft.totalFare || 0;
  const isOfflineSelected = selectedMethod === 'Offline_Cash';

  return (
    <View style={styles.container}>
      <Header title="Payment & Checkout" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Payable Header Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountHeaderRow}>
            <View style={[styles.testModeBadge, isOfflineSelected && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name={isOfflineSelected ? 'cash' : 'flash'} size={12} color="#10b981" />
              <Text style={styles.testModeText}>
                {isOfflineSelected ? 'OFFLINE CASH PAYMENT' : 'RAZORPAY TEST MODE'}
              </Text>
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
              <Text style={styles.summaryVal}>
                {Array.isArray(bookingDraft.selectedSeats) ? bookingDraft.selectedSeats.join(', ') : String(bookingDraft.selectedSeats)}
              </Text>
            </View>
          )}

          {bookingDraft.passengerDetails && bookingDraft.passengerDetails[0]?.name ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passenger</Text>
              <Text style={styles.summaryVal}>{bookingDraft.passengerDetails[0].name}</Text>
            </View>
          ) : null}
          {bookingDraft.serviceType === 'EV-Sewa' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passengers</Text>
              <Text style={styles.summaryVal}>{bookingDraft.passengerCount || bookingDraft.passengerDetails?.length || 1}</Text>
            </View>
          )}
        </View>

        {/* Failed Error Banner */}
        {paymentState === 'failed' && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorTitle}>Booking / Payment Notice</Text>
              <Text style={styles.errorDesc}>{errorMessage}</Text>
              <Text style={styles.errorHint}>Your booking remains in Pending state. You can retry anytime.</Text>
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <Text style={styles.sectionHeader}>Select Payment Method</Text>

        {visiblePaymentOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.methodCard,
              selectedMethod === option.id && styles.selectedMethodCard,
              option.isUpcoming && styles.upcomingMethodCard
            ]}
            onPress={() => {
              if (option.isUpcoming) {
                Alert.alert(
                  'Online Payment Coming Soon',
                  'Online payment options (UPI, Card, Net Banking) are currently upcoming. Please proceed with "Offline Cash (Pay on Boarding)" to confirm your journey.',
                  [{ text: 'OK' }]
                );
                return;
              }
              setSelectedMethod(option.id);
            }}
            activeOpacity={option.isUpcoming ? 0.7 : 0.8}
          >
            <View style={[styles.methodIconBox, { backgroundColor: option.isUpcoming ? '#f1f5f9' : option.color + '15' }]}>
              <Ionicons name={option.icon} size={22} color={option.isUpcoming ? '#64748b' : option.color} />
            </View>
            <View style={styles.methodInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.methodTitle, option.isUpcoming && styles.upcomingMethodTitle]}>{option.title}</Text>
                {option.isOffline ? (
                  <View style={styles.cashBadge}>
                    <Text style={styles.cashBadgeText}>POPULAR • ACTIVE</Text>
                  </View>
                ) : option.isUpcoming ? (
                  <View style={styles.upcomingBadge}>
                    <Ionicons name="time-outline" size={10} color="#b45309" />
                    <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
                  </View>
                ) : (
                  <View style={styles.cashBadge}>
                    <Text style={styles.cashBadgeText}>RAZORPAY TEST</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.methodSub, option.isUpcoming && styles.upcomingMethodSub]}>{option.subtitle}</Text>
            </View>
            <View style={[styles.radioOuter, option.isUpcoming && styles.upcomingRadioOuter]}>
              {option.isUpcoming ? (
                <Ionicons name="lock-closed" size={11} color="#94a3b8" />
              ) : selectedMethod === option.id ? (
                <View style={styles.radioInner} />
              ) : null}
            </View>
          </TouchableOpacity>
        ))}

          <>
            {/* Instructions / Guarantee Box */}
            <View style={styles.offlineGuideBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="cash" size={20} color="#059669" />
                <Text style={styles.offlineGuideTitle}>Offline Cash Instructions</Text>
              </View>
              <Text style={styles.offlineGuideText}>
                • No advance online payment is required.
              </Text>
              <Text style={styles.offlineGuideText}>
                • Your booking request is directly sent to the assigned driver/conductor for instant reservation.
              </Text>
              <Text style={styles.offlineGuideText}>
                • Pay the exact fare of <Text style={{ fontWeight: '800' }}>₹{finalPayable}</Text> in cash to the conductor or driver when boarding.
              </Text>
            </View>

            <View style={styles.upcomingNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color="#b45309" />
              <Text style={styles.upcomingNoticeText}>
                Online digital payments (UPI QR, Cards, NetBanking) are currently upcoming. Cash on boarding is the primary verified payment method.
              </Text>
            </View>
          </>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={`Confirm Booking (Offline Cash - ₹${finalPayable})`}
          onPress={handleConfirmOfflineCash}
          style={{ backgroundColor: '#059669' }}
        />
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
  cashBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  cashBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d'
  },
  upcomingMethodCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.88
  },
  upcomingMethodTitle: {
    color: '#64748b'
  },
  upcomingMethodSub: {
    color: '#94a3b8'
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  upcomingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5
  },
  upcomingRadioOuter: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9'
  },
  upcomingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
    marginTop: 10
  },
  upcomingNoticeText: {
    fontSize: 11,
    color: '#92400e',
    flex: 1,
    lineHeight: 16
  },
  offlineGuideBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    padding: 14,
    borderRadius: 12,
    marginTop: 8
  },
  offlineGuideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46'
  },
  offlineGuideText: {
    fontSize: 12,
    color: '#047857',
    marginTop: 4,
    lineHeight: 18
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
