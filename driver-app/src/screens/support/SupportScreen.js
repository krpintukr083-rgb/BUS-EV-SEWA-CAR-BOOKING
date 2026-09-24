import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';
import { useFocusEffect } from '@react-navigation/native';

export default function SupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [recentTickets, setRecentTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await driverService.getSupport();
      if (res.success && res.data?.tickets) {
        setRecentTickets(res.data.tickets);
      }
    } catch (err) {
      console.log('Error fetching tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTickets();
    }, [])
  );

  const [expandedFaq, setExpandedFaq] = useState(null);
  const [subject, setSubject] = useState('');
  const CATEGORIES = [
    { label: 'Payment', value: 'Payment Issue' },
    { label: 'KYC', value: 'KYC/Account' },
    { label: 'Trip', value: 'Customer Issue' },
    { label: 'Technical', value: 'Vehicle Issue' }
  ];

  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const faqs = [
    {
      q: 'How is driver earnings calculated?',
      a: 'Drivers receive 80% of the total customer trip fare directly into their driver wallet upon ride completion. The platform retains a 20% platform service fee.',
    },
    {
      q: 'How do wallet payouts work?',
      a: 'You can request a payout anytime for amounts ₹100 or above via Bank Transfer, eSewa, or Khalti. Requests are reviewed and processed by admin within 24 hours.',
    },
    {
      q: 'What if a passenger does not show up?',
      a: 'When you arrive at the pickup point, tap "Arrived at Pickup". A waiting timer begins. If the customer does not arrive after 5 minutes, you may cancel the ride with reason "Customer No-Show".',
    },
    {
      q: 'How to update expired KYC documents?',
      a: 'Go to Documents & KYC from the Profile menu, tap "Update / Re-upload" on the expiring document, enter new validity dates and submit for instant admin verification.',
    },
  ];

  const handleSubmitTicket = async () => {
    if (!description.trim()) {
      Alert.alert(t('error'), 'Issue description is required');
      return;
    }
    if (!subject.trim()) {
      Alert.alert(t('error'), 'Subject is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await driverService.submitSupportTicket({
        category,
        subject: subject.trim(),
        supportIssue: description.trim(),
      });
      if (res.success) {
        Alert.alert(t('success'), 'Support ticket submitted! Ticket ID #' + (res.data?._id?.slice(-6) || '7821'));
        setSubject('');
        setDescription('');
        fetchTickets();
      } else {
        Alert.alert(t('error'), res.message || 'Failed to submit ticket');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/9779801234567?text=Hello%20TravelSewa%20Driver%20Support').catch(() => {
      Alert.alert(t('error'), 'Unable to open WhatsApp');
    });
  };

  const callSupport = () => {
    Linking.openURL('tel:+97714455667').catch(() => {
      Alert.alert(t('error'), 'Unable to make phone call');
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('driverSupport')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Contact Buttons */}
        <View style={styles.quickContactRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={openWhatsApp}>
            <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
            <Text style={styles.quickBtnText}>WhatsApp Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={callSupport}>
            <MaterialCommunityIcons name="phone-in-talk" size={24} color={COLORS.primary} />
            <Text style={styles.quickBtnText}>Call Support</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Ticket Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('submitSupportTicket')}</Text>

          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.catBtn, category === cat.value && styles.catBtnActive]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={[styles.catBtnText, category === cat.value && styles.catBtnTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief issue title"
            placeholderTextColor={COLORS.textMuted}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.inputLabel}>Message Description *</Text>
          <TextInput
            style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            disabled={submitting}
            onPress={handleSubmitTicket}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>{t('submitTicket')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Recent Tickets */}
        {recentTickets.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Recent Support Tickets</Text>
            {recentTickets.map(t => (
              <View key={t._id || t.ticketId} style={styles.faqCard}>
                <View style={[styles.faqHeader, { marginBottom: 6 }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>Ticket: {t.ticketId}</Text>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                    backgroundColor: t.status === 'Resolved' ? '#dcfce7' : '#fef3c7'
                  }}>
                    <Text style={{
                      fontSize: 10, fontWeight: '700',
                      color: t.status === 'Resolved' ? '#166534' : '#92400e'
                    }}>{t.status}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{t.supportIssue}</Text>
                
                {t.resolutionNotes ? (
                  <View style={{ marginTop: 8, padding: 10, backgroundColor: '#f1f5f9', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', marginBottom: 2 }}>Admin Reply:</Text>
                    <Text style={{ fontSize: 12, color: '#334155' }}>{t.resolutionNotes}</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 8, padding: 10, backgroundColor: '#1e293b', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#475569' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 2 }}>Admin Reply:</Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Waiting for admin response</Text>
                  </View>
                )}
                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>Logged: {new Date(t.createdAt).toLocaleDateString('en-IN')}</Text>
              </View>
            ))}
          </>
        )}

        {/* FAQs */}
        <Text style={styles.sectionTitle}>{t('frequentlyAskedQuestions')}</Text>
        {faqs.map((faq, idx) => {
          const isExpanded = expandedFaq === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={styles.faqCard}
              onPress={() => setExpandedFaq(isExpanded ? null : idx)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </View>
              {isExpanded && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.s,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: SPACING.m,
    marginBottom: SPACING.m,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    paddingVertical: SPACING.m,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.card,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.l,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.m,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: SPACING.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.m,
  },
  catBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: RADIUS.s,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  catBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  catBtnTextActive: {
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    marginTop: SPACING.s,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.m,
  },
  faqCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    marginBottom: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.s,
  },
  faqAnswer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.s,
    lineHeight: 18,
  },
});
