import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [wallet, setWallet] = useState({ walletBalance: 0, totalEarnings: 0, pendingPayouts: 0 });
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Payout Modal
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('BANK'); // 'BANK', 'ESEWA', 'KHALTI'
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [payoutErrors, setPayoutErrors] = useState({});
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const payoutSubmissionLock = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const payoutScrollRef = useRef(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        if (e?.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setError(null);
      const rawRes = await driverService.getWallet();
      // Account for Axios response wrapper (res.data) or directly normalized payload
      const responsePayload = rawRes?.data !== undefined && rawRes?.status !== undefined ? rawRes.data : rawRes;
      const isSuccess = responsePayload?.success !== false;
      const walletData = responsePayload?.data || (responsePayload && !responsePayload.data && responsePayload.walletBalance !== undefined ? responsePayload : null);

      if (isSuccess && walletData) {
        const rawPending = (walletData.recentWithdrawals || [])
          .filter(item => ['Pending', 'Processing'].includes(item.status))
          .reduce((total, item) => total + Number(item.amount || 0), 0);

        setWallet({
          ...walletData,
          walletBalance: Number(walletData.walletBalance ?? 0),
          totalEarnings: Number(walletData.totalEarnings ?? 0),
          totalWithdrawn: Number(walletData.totalWithdrawn ?? 0),
          pendingPayouts: rawPending
        });
        setTransactions(Array.isArray(walletData.ledger) ? walletData.ledger : []);
        setWithdrawals(Array.isArray(walletData.recentWithdrawals) ? walletData.recentWithdrawals : []);
      } else {
        const errMsg = responsePayload?.message || 'Failed to load wallet balance';
        setError(errMsg);
      }
    } catch (err) {
      console.log('Error loading wallet:', err);
      const errMsg = err.response?.data?.message || err.message || 'Network error loading wallet data';
      setError(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const getWithdrawalStatusLabel = status => {
    const normalizedStatus = String(status || '').toLowerCase();
    if (['completed', 'successful', 'succeeded', 'paid'].includes(normalizedStatus)) return 'Payment Done';
    if (normalizedStatus === 'processing') return 'Processing';
    if (normalizedStatus === 'rejected') return 'Rejected';
    if (normalizedStatus === 'pending') return 'Pending';
    return status || 'Pending';
  };

  const handleRequestPayout = async () => {
    if (payoutSubmissionLock.current) return;

    const amountValue = payoutAmount.trim();
    const amountNum = Number(amountValue);
    const availableBalance = Number(wallet.walletBalance) || 0;
    const errors = {};

    if (!amountValue || !/^\d+(?:\.\d{1,2})?$/.test(amountValue) || !Number.isFinite(amountNum) || amountNum <= 0) {
      errors.amount = 'Enter a valid positive amount.';
    } else if (amountNum < 100) {
      errors.amount = 'Minimum withdrawal amount is ₹100.';
    } else if (amountNum > availableBalance) {
      errors.amount = `Amount cannot exceed your available balance of ₹${availableBalance}.`;
    }

    if (!accountNumber.trim()) {
      errors.accountNumber = payoutMethod === 'BANK'
        ? 'Enter your bank account number.'
        : `Enter your ${payoutMethod === 'ESEWA' ? 'eSewa' : 'Khalti'} wallet ID.`;
    }
    if (!accountHolder.trim()) {
      errors.accountHolder = 'Enter the account holder name.';
    }
    if (payoutMethod === 'BANK' && !bankName.trim()) {
      errors.bankName = 'Enter the bank name.';
    }
    if (payoutMethod === 'BANK' && !bankBranch.trim()) {
      errors.bankBranch = 'Enter the IFSC or branch.';
    }

    setPayoutErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    payoutSubmissionLock.current = true;
    setSubmittingPayout(true);
    try {
      const payoutPayload = {
        amount: amountNum,
        payoutMethod,
        payoutDetails: payoutMethod === 'BANK'
          ? {
              accountNumber: accountNumber.trim(),
              accountHolderName: accountHolder.trim(),
              bankName: bankName.trim(),
              branch: bankBranch.trim()
            }
          : payoutMethod === 'ESEWA'
          ? { esewaId: accountNumber.trim(), accountHolderName: accountHolder.trim() }
          : { khaltiId: accountNumber.trim(), accountHolderName: accountHolder.trim() }
      };

      const res = await driverService.requestWithdrawal(payoutPayload);
      const responsePayload = res?.data ?? res;
      if (responsePayload?.success === true && responsePayload?.data) {
        Alert.alert(t('success'), 'Withdrawal request submitted successfully.');
        setPayoutModalVisible(false);
        setPayoutAmount('');
        setAccountNumber('');
        setAccountHolder('');
        setBankName('');
        setBankBranch('');
        setPayoutErrors({});
        fetchWalletData();
      } else {
        Alert.alert(t('error'), responsePayload?.message || 'Failed to submit withdrawal request');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Withdrawal request failed');
    } finally {
      setSubmittingPayout(false);
      payoutSubmissionLock.current = false;
    }
  };

  const renderTransaction = ({ item }) => {
    const isCredit = item.type === 'CREDIT' || item.type === 'RIDE_EARNING' || item.type === 'REFUND';
    const isCommission = item.type === 'COMMISSION';
    const isDebit = item.type === 'DEBIT' || item.type === 'WITHDRAWAL';

    return (
      <View style={styles.transCard}>
        <View style={[
          styles.transIconBox,
          isCredit && { backgroundColor: COLORS.success + '20' },
          isCommission && { backgroundColor: COLORS.warning + '20' },
          isDebit && { backgroundColor: COLORS.danger + '20' },
        ]}>
          <MaterialCommunityIcons
            name={
              isCredit
                ? 'arrow-down-left'
                : isCommission
                ? 'percent'
                : 'arrow-up-right'
            }
            size={20}
            color={
              isCredit
                ? COLORS.success
                : isCommission
                ? COLORS.warning
                : COLORS.danger
            }
          />
        </View>

        <View style={styles.transDetails}>
          <Text style={styles.transDesc}>{item.description || item.type}</Text>
          <Text style={styles.transDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
          </Text>
        </View>

        <Text style={[
          styles.transAmount,
          isCredit ? { color: COLORS.success } : { color: COLORS.danger },
        ]}>
          {isCredit ? '+' : '-'}₹{item.amount}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('driverWallet')}</Text>
        <TouchableOpacity
          style={styles.earningsBtn}
          onPress={() => navigation.navigate('Earnings')}
        >
          <MaterialCommunityIcons name="chart-bell-curve" size={18} color={COLORS.primary} />
          <Text style={styles.earningsBtnText}>{t('earningsSummary')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Error State Banner */}
        {error ? (
          <View style={styles.errorCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.danger} />
              <Text style={styles.errorTitle}>Wallet Sync Notice</Text>
            </View>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchWalletData}>
              <MaterialCommunityIcons name="refresh" size={16} color={COLORS.white} />
              <Text style={styles.retryBtnText}>Retry Sync</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('availableBalance')}</Text>
          <Text style={styles.balanceAmount}>₹{Number(wallet.walletBalance || 0).toFixed(2)}</Text>
          <Text style={styles.commissionNote}>
            * Net driver earnings credited after applicable platform charges
          </Text>

          <View style={styles.balanceStatsRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>{t('totalEarned')}</Text>
              <Text style={styles.balanceStatValue}>₹{wallet.totalEarnings || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>{t('pendingPayout')}</Text>
              <Text style={styles.balanceStatValue}>₹{wallet.pendingPayouts || 0}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.payoutButton}
            onPress={() => {
              setPayoutErrors({});
              setPayoutModalVisible(true);
            }}
          >
            <MaterialCommunityIcons name="bank-transfer-out" size={20} color={COLORS.white} />
            <Text style={styles.payoutButtonText}>{t('requestPayout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions Section */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>{t('recentTransactions')}</Text>
          <Text style={styles.txCount}>{transactions.length} entries</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyTrans}>
            <MaterialCommunityIcons name="wallet-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTransText}>{t('noTransactions')}</Text>
          </View>
        ) : (
          transactions.map((tx, idx) => (
            <React.Fragment key={tx._id || idx.toString()}>
              {renderTransaction({ item: tx })}
            </React.Fragment>
          ))
        )}

        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Withdrawal Requests</Text>
          <Text style={styles.txCount}>{withdrawals.length} requests</Text>
        </View>
        {withdrawals.length === 0 ? (
          <View style={styles.emptyTrans}>
            <Text style={styles.emptyTransText}>No withdrawal requests yet.</Text>
          </View>
        ) : withdrawals.map(withdrawal => {
          const normalizedStatus = String(withdrawal.status || '').toLowerCase();
          const isPaymentDone = ['completed', 'successful', 'succeeded', 'paid'].includes(normalizedStatus);
          return (
            <View key={withdrawal._id} style={styles.withdrawalCard}>
              <View style={styles.withdrawalTopRow}>
                <Text style={styles.withdrawalAmount}>₹{Number(withdrawal.amount).toFixed(2)}</Text>
                <Text style={[
                  styles.withdrawalStatus,
                  normalizedStatus === 'rejected' && styles.withdrawalRejected,
                  normalizedStatus === 'processing' && styles.withdrawalProcessing,
                  isPaymentDone && styles.withdrawalCompleted
                ]}>
                  {getWithdrawalStatusLabel(withdrawal.status)}
                </Text>
              </View>
              <Text style={styles.transDate}>
                {withdrawal.referenceId} · {withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleDateString() : ''}
              </Text>
              {normalizedStatus === 'rejected' && withdrawal.adminNotes ? (
                <Text style={styles.rejectionReason}>Reason: {withdrawal.adminNotes}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Payout Request Modal */}
      <Modal
        visible={payoutModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (!submittingPayout) setPayoutModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdropDismissArea} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.payoutCard,
              {
                maxHeight: keyboardVisible ? '85%' : '90%',
              },
            ]}
          >
            {/* Top Header */}
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>{t('requestPayout')}</Text>
              <TouchableOpacity
                disabled={submittingPayout}
                onPress={() => setPayoutModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              ref={payoutScrollRef}
              style={styles.modalScrollBody}
              contentContainerStyle={[
                styles.modalScrollContent,
                {
                  paddingBottom: Math.max(insets.bottom || 0, 16) + (keyboardVisible && keyboardHeight > 0 ? keyboardHeight + 16 : 24),
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              {/* Payout Method Selector */}
              <Text style={styles.inputLabel}>{t('selectPaymentMethod')}</Text>
              <View style={styles.methodSelectorRow}>
                {[
                  { id: 'BANK', label: 'Bank Transfer', icon: 'bank' },
                  { id: 'ESEWA', label: 'eSewa', icon: 'wallet' },
                  { id: 'KHALTI', label: 'Khalti', icon: 'cellphone' },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodBtn,
                      payoutMethod === m.id && styles.methodBtnActive,
                    ]}
                    onPress={() => {
                      setPayoutMethod(m.id);
                      setPayoutErrors({});
                    }}
                  >
                    <MaterialCommunityIcons
                      name={m.icon}
                      size={18}
                      color={payoutMethod === m.id ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.methodBtnText,
                        payoutMethod === m.id && styles.methodBtnTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount Input */}
              <Text style={styles.inputLabel}>{t('amount')} (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={payoutAmount}
                onChangeText={(value) => {
                  setPayoutAmount(value);
                  setPayoutErrors((current) => ({ ...current, amount: undefined }));
                }}
                onFocus={() => {
                  setTimeout(() => {
                    payoutScrollRef.current?.scrollTo({ y: 40, animated: true });
                  }, 120);
                }}
              />
              {payoutErrors.amount ? <Text style={styles.fieldError}>{payoutErrors.amount}</Text> : null}

              {/* Account Details */}
              <Text style={styles.inputLabel}>
                {payoutMethod === 'BANK' ? 'Account Number' : 'Wallet Mobile ID'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={payoutMethod === 'BANK' ? 'Enter Bank Account No.' : 'Enter 10-digit Mobile'}
                placeholderTextColor={COLORS.textMuted}
                value={accountNumber}
                onChangeText={(value) => {
                  setAccountNumber(value);
                  setPayoutErrors((current) => ({ ...current, accountNumber: undefined }));
                }}
                onFocus={() => {
                  setTimeout(() => {
                    payoutScrollRef.current?.scrollTo({ y: 120, animated: true });
                  }, 120);
                }}
              />
              {payoutErrors.accountNumber ? <Text style={styles.fieldError}>{payoutErrors.accountNumber}</Text> : null}

              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name on Account"
                placeholderTextColor={COLORS.textMuted}
                value={accountHolder}
                onChangeText={(value) => {
                  setAccountHolder(value);
                  setPayoutErrors((current) => ({ ...current, accountHolder: undefined }));
                }}
                onFocus={() => {
                  setTimeout(() => {
                    payoutScrollRef.current?.scrollTo({ y: 200, animated: true });
                  }, 120);
                }}
              />
              {payoutErrors.accountHolder ? <Text style={styles.fieldError}>{payoutErrors.accountHolder}</Text> : null}

              {payoutMethod === 'BANK' && (
                <>
                  <Text style={styles.inputLabel}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter bank name"
                    placeholderTextColor={COLORS.textMuted}
                    value={bankName}
                    onChangeText={(value) => {
                      setBankName(value);
                      setPayoutErrors((current) => ({ ...current, bankName: undefined }));
                    }}
                    onFocus={() => {
                      setTimeout(() => {
                        payoutScrollRef.current?.scrollTo({ y: 280, animated: true });
                      }, 120);
                    }}
                  />
                  {payoutErrors.bankName ? <Text style={styles.fieldError}>{payoutErrors.bankName}</Text> : null}

                  <Text style={styles.inputLabel}>IFSC / Branch</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter IFSC or branch"
                    placeholderTextColor={COLORS.textMuted}
                    value={bankBranch}
                    onChangeText={(value) => {
                      setBankBranch(value);
                      setPayoutErrors((current) => ({ ...current, bankBranch: undefined }));
                    }}
                  />
                  {payoutErrors.bankBranch ? <Text style={styles.fieldError}>{payoutErrors.bankBranch}</Text> : null}
                </>
              )}

              {/* Submit Payout Button as normal scrollable in-flow element */}
              <TouchableOpacity
                style={[styles.submitPayoutBtn, submittingPayout && { opacity: 0.7 }]}
                disabled={submittingPayout}
                onPress={handleRequestPayout}
                activeOpacity={0.8}
              >
                {submittingPayout ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitPayoutText}>{t('submitPayout')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  earningsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.s,
    gap: 4,
  },
  earningsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  errorCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.danger + '60',
    marginBottom: SPACING.m,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  errorMessage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: SPACING.m,
    borderRadius: RADIUS.s,
    gap: 6,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    ...SHADOWS.card,
    marginBottom: SPACING.l,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.success,
    marginVertical: SPACING.xs,
  },
  commissionNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: SPACING.m,
  },
  balanceStatsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    paddingVertical: SPACING.s,
    marginVertical: SPACING.s,
  },
  balanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  balanceStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  balanceStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.m,
    gap: 8,
    marginTop: SPACING.s,
  },
  payoutButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  txCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  transCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  transDetails: {
    flex: 1,
  },
  transDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  transDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  transAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  withdrawalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    marginBottom: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  withdrawalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  withdrawalAmount: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  withdrawalStatus: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  withdrawalRejected: {
    color: COLORS.danger,
  },
  withdrawalProcessing: {
    color: COLORS.warning,
  },
  withdrawalCompleted: {
    color: COLORS.success,
  },
  rejectionReason: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
  },
  emptyTrans: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTransText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.s,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismissArea: {
    flex: 1,
  },
  keyboardAvoidingWrap: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  payoutCard: {
    backgroundColor: COLORS.bgSurface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.l,
    paddingHorizontal: SPACING.l,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  modalScrollBody: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: SPACING.m,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: SPACING.xs,
  },
  methodSelectorRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgDark,
    paddingVertical: 10,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  methodBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  methodBtnText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  methodBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.s,
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.s,
  },
  submitPayoutBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    marginTop: SPACING.s,
    marginBottom: SPACING.m,
  },
  submitPayoutText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
