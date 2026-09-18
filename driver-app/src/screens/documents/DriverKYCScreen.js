import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';
import DocumentUploadModal from '../../components/DocumentUploadModal';

export default function DriverKYCScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState({
    citizenship: { status: 'PENDING', documentNumber: '', expiryDate: '' },
    drivingLicense: { status: 'VERIFIED', documentNumber: 'DL-9820-2022', expiryDate: '2028-12-31' },
    vehicleRc: { status: 'VERIFIED', documentNumber: 'BA-2-PA-8821', expiryDate: '2027-05-15' },
    insurance: { status: 'EXPIRED', documentNumber: 'INS-7721890', expiryDate: '2024-01-10' },
    fitnessCertificate: { status: 'PENDING', documentNumber: 'FIT-2024-09', expiryDate: '2025-08-30' },
  });

  const [selectedDocKey, setSelectedDocKey] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await driverService.getDocuments();
      if (res.success && res.data) {
        setDocuments((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch (err) {
      console.log('Error loading KYC documents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const handleOpenUpload = (docKey) => {
    setSelectedDocKey(docKey);
    setUploadModalVisible(true);
  };

  const handleDocumentSubmitted = () => {
    fetchDocuments();
  };

  const docConfigs = [
    {
      key: 'drivingLicense',
      title: t('drivingLicense'),
      icon: 'card-account-details',
      desc: 'Valid heavy/light commercial transport driving licence',
    },
    {
      key: 'citizenship',
      title: t('citizenshipDoc'),
      icon: 'account-badge',
      desc: 'National Identity Card or Citizenship Certificate',
    },
    {
      key: 'vehicleRc',
      title: t('vehicleRc'),
      icon: 'file-document-outline',
      desc: 'Vehicle Blue Book / Registration Certificate',
    },
    {
      key: 'insurance',
      title: t('insurance'),
      icon: 'shield-check',
      desc: 'Comprehensive third-party & passenger insurance policy',
    },
    {
      key: 'fitnessCertificate',
      title: t('fitnessCertificate'),
      icon: 'car-wrench',
      desc: 'Authorized transport department fitness certificate',
    },
  ];

  // Check for expired or expiring soon documents
  const hasExpiredDoc = Object.values(documents).some((d) => d?.status === 'EXPIRED');

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return COLORS.success;
      case 'EXPIRED':
        return COLORS.danger;
      case 'UNDER_REVIEW':
      case 'PENDING':
        return COLORS.warning;
      default:
        return COLORS.textMuted;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('kycDocuments')}</Text>
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
        {/* Compliance Warning Banner if any document expired */}
        {hasExpiredDoc && (
          <View style={styles.alertBanner}>
            <MaterialCommunityIcons name="alert-decagram" size={22} color={COLORS.danger} />
            <View style={{ flex: 1, marginLeft: SPACING.s }}>
              <Text style={styles.alertTitle}>KYC Attention Required</Text>
              <Text style={styles.alertSub}>
                One or more documents have expired. Please renew and re-upload to keep receiving trip requests.
              </Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          docConfigs.map((doc) => {
            const docData = documents[doc.key] || { status: 'MISSING' };
            const statusColor = getStatusColor(docData.status);

            return (
              <View key={doc.key} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <View style={styles.docIconBox}>
                    <MaterialCommunityIcons name={doc.icon} size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.docTitleCol}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    <Text style={styles.docDesc}>{doc.desc}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {docData.status || 'MISSING'}
                    </Text>
                  </View>
                </View>

                {/* Metadata Row */}
                <View style={styles.docMetaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Doc / License No:</Text>
                    <Text style={styles.metaVal}>{docData.documentNumber || 'Not submitted'}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>{t('expiryDate')}:</Text>
                    <Text style={[
                      styles.metaVal,
                      docData.status === 'EXPIRED' && { color: COLORS.danger, fontWeight: '700' }
                    ]}>
                      {docData.expiryDate || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Upload / Re-upload Button */}
                <TouchableOpacity
                  style={[
                    styles.uploadBtn,
                    docData.status === 'VERIFIED' && styles.reuploadBtn,
                  ]}
                  onPress={() => handleOpenUpload(doc.key)}
                >
                  <MaterialCommunityIcons
                    name={docData.status === 'VERIFIED' ? 'file-replace' : 'cloud-upload'}
                    size={16}
                    color={docData.status === 'VERIFIED' ? COLORS.primary : COLORS.white}
                  />
                  <Text style={[
                    styles.uploadBtnText,
                    docData.status === 'VERIFIED' && { color: COLORS.primary }
                  ]}>
                    {docData.status === 'VERIFIED' ? 'Update / Re-upload' : t('uploadDocument')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        documentType={selectedDocKey}
        onSuccess={handleDocumentSubmitted}
      />
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '20',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    marginBottom: SPACING.m,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  alertSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  docIconBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  docTitleCol: {
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  docDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.s,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  docMetaRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.s,
    marginVertical: SPACING.m,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.m,
    gap: 6,
  },
  reuploadBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  uploadBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
