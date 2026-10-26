import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import { OFFICIAL_CONTACT } from '../../constants/contact';

const CustomerSupportScreen = ({ navigation }) => {
  const [supportData, setSupportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // New ticket state
  const [issueTopic, setIssueTopic] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentTickets, setRecentTickets] = useState([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchSupport = async () => {
    try {
      const res = await customerService.getSupportInfo();
      if (res.success) {
        setSupportData(res.data);
        if (res.data.tickets) {
          setRecentTickets(res.data.tickets);
        }
      }
    } catch (err) {
      console.log('Error fetching support info:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSupport();
    }, [])
  );

  const handleSubmitTicket = async () => {
    if (!issueTopic.trim()) {
      Alert.alert('Required Field', 'Please enter an issue subject or topic.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      const res = await customerService.submitSupportTicket({
        supportIssue: issueTopic.trim(),
        bookingId: bookingRef.trim() || 'N/A',
        message: ticketMessage.trim()
      });

      if (res.success) {
        setSubmitSuccess(true);
        setIssueTopic('');
        setBookingRef('');
        setTicketMessage('');
        fetchSupport(); // Refresh tickets list
        Alert.alert('Success', 'Your support request has been logged successfully.');
      }
    } catch (err) {
      console.log('Error submitting support ticket:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit support request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = (phone = OFFICIAL_CONTACT.PHONE_RAW) => {
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber || OFFICIAL_CONTACT.PHONE_RAW}`).catch(() => {
      Alert.alert('Call Failed', `Unable to make phone call. Please dial ${OFFICIAL_CONTACT.PHONE_DISPLAY} directly.`);
    });
  };

  const handleWhatsApp = async () => {
    const url = OFFICIAL_CONTACT.WHATSAPP_URL_WITH_TEXT('Hello TravelSewa Customer Support');
    try {
      const supported = await Linking.canOpenURL(url).catch(() => false);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url).catch(() => {
          Alert.alert(
            'WhatsApp Not Installed',
            `WhatsApp is not installed on this device. Please call our official support at ${OFFICIAL_CONTACT.PHONE_DISPLAY}.`
          );
        });
      }
    } catch (err) {
      Alert.alert(
        'WhatsApp Not Installed',
        `Could not open WhatsApp. Please call our official support at ${OFFICIAL_CONTACT.PHONE_DISPLAY}.`
      );
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Customer Support" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isKeyboardOpen && { paddingBottom: 120 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Support Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Ionicons name="headset" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>24x7 Customer Passenger Support</Text>
          <Text style={styles.heroSub}>
            Have a question about your booking, boarding points, or statutory insurance claim? Submit a ticket, chat on WhatsApp, or call our helpline.
          </Text>
        </View>

        {/* Direct Contact Channels */}
        <Text style={styles.sectionHeading}>Official Helplines</Text>

        <TouchableOpacity
          style={styles.contactCard}
          onPress={handleWhatsApp}
          activeOpacity={0.8}
        >
          <View style={[styles.channelIcon, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.channelTitle}>WhatsApp Support</Text>
            <Text style={styles.channelValue}>{OFFICIAL_CONTACT.PHONE_DISPLAY} (Chat with us)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => handleCall(OFFICIAL_CONTACT.PHONE_RAW)}
          activeOpacity={0.8}
        >
          <View style={[styles.channelIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="call" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.channelTitle}>Official Helpline</Text>
            <Text style={styles.channelValue}>{OFFICIAL_CONTACT.PHONE_DISPLAY} (24 Hours)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => handleEmail(OFFICIAL_CONTACT.SUPPORT_EMAIL)}
          activeOpacity={0.8}
        >
          <View style={[styles.channelIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.channelTitle}>Support Email</Text>
            <Text style={styles.channelValue}>{OFFICIAL_CONTACT.SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Submit Support Request Form */}
        <Text style={styles.sectionHeading}>Submit a Support Ticket</Text>

        <View style={styles.ticketFormCard}>
          <Text style={styles.inputLabel}>Issue Topic / Subject *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Booking confirmation delay, Refund query"
            placeholderTextColor="#94a3b8"
            value={issueTopic}
            onChangeText={setIssueTopic}
          />

          <Text style={styles.inputLabel}>Booking ID / Reference (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., BK-9872"
            placeholderTextColor="#94a3b8"
            value={bookingRef}
            onChangeText={setBookingRef}
            autoCapitalize="characters"
          />

          <Text style={styles.inputLabel}>Details / Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your issue or question in detail..."
            placeholderTextColor="#94a3b8"
            value={ticketMessage}
            onChangeText={setTicketMessage}
            multiline
            numberOfLines={4}
          />

          <Button
            title={submitting ? "Submitting..." : "Submit Support Request"}
            onPress={handleSubmitTicket}
            disabled={submitting}
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Recent Tickets */}
        {recentTickets.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>My Recent Support Tickets</Text>
            {recentTickets.map(t => (
              <View key={t._id || t.ticketId} style={styles.ticketItemCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketIdText}>Ticket: {t.ticketId}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: t.status === 'Resolved' ? '#dcfce7' : '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: t.status === 'Resolved' ? '#166534' : '#92400e' }
                    ]}>{t.status}</Text>
                  </View>
                </View>
                <Text style={styles.ticketSubject}>{t.supportIssue}</Text>
                {t.bookingId && t.bookingId !== 'N/A' && (
                  <Text style={styles.ticketBooking}>Booking Ref: {t.bookingId}</Text>
                )}
                {t.resolutionNotes ? (
                  <View style={{ marginTop: 8, padding: 10, backgroundColor: '#f1f5f9', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', marginBottom: 2 }}>Admin Reply:</Text>
                    <Text style={{ fontSize: 12, color: '#334155' }}>{t.resolutionNotes}</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 8, padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#94a3b8' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 }}>Admin Reply:</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Waiting for admin response</Text>
                  </View>
                )}
                <Text style={styles.ticketDate}>Logged: {new Date(t.createdAt).toLocaleDateString('en-IN')}</Text>
              </View>
            ))}
          </>
        )}

        {/* Guidelines */}
        <Text style={styles.sectionHeading}>Helpline Guidelines</Text>
        <View style={styles.faqCard}>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Booking & Seat Inquiries</Text>
            <Text style={styles.faqAnswer}>
              Assistance regarding ticket confirmations, seat numbers, and boarding point locations.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Cancellations & Refund Status</Text>
            <Text style={styles.faqAnswer}>
              Direct queries regarding ticket cancellation refund status and source bank credit timelines.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20
  },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  heroSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 10,
    marginTop: 10,
    marginLeft: 4
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  channelValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  ticketFormCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkNavy,
    marginBottom: 6,
    marginTop: 8
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  ticketItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  ticketIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkNavy
  },
  ticketBooking: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  ticketDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4
  },
  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  faqItem: {
    paddingVertical: 4
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 4
  },
  faqAnswer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10
  }
});

export default CustomerSupportScreen;
