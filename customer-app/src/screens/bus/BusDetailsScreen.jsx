import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import { getPrimaryVehicleImage, getAllVehicleImages } from '../../utils/imageUrl';

const formatPoints = (points, fallback) => {
  if (!points) return fallback || '';
  if (Array.isArray(points)) {
    const valid = points.filter(Boolean);
    return valid.length > 0 ? valid.join(', ') : fallback || '';
  }
  return String(points);
};

const BusDetailsScreen = ({ navigation, route }) => {
  const { busId, bus: initialBus } = route.params || {};
  const { bookingDraft, updateDraft } = useBooking();
  
  const [bus, setBus] = useState(
    initialBus || (bookingDraft.vehicle?._id === busId ? bookingDraft.vehicle : null)
  );
  const [loading, setLoading] = useState(!bus);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchDetails = async () => {
    const targetId = busId || bus?._id || bookingDraft.vehicle?._id;
    if (!targetId) {
      setLoading(false);
      return;
    }

    try {
      setErrorMessage('');
      const res = await customerService.getBusDetails(targetId);
      if (res.success && res.data) {
        setBus(res.data);
        updateDraft({
          vehicle: res.data,
          baseFare: res.data.fareRate
        });
      }
    } catch (err) {
      console.log('Error fetching bus details:', err);
      setErrorMessage(err.response?.data?.message || 'Unable to refresh bus details from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [busId]);

  if (loading && !bus) {
    return (
      <View style={styles.container}>
        <Header title="Bus Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading coach specifications...</Text>
        </View>
      </View>
    );
  }

  if (!bus) {
    return (
      <View style={styles.container}>
        <Header title="Bus Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={54} color="#ef4444" />
          <Text style={styles.errorTitle}>Bus Information Unavailable</Text>
          <Text style={styles.errorSub}>
            {errorMessage || 'The selected coach details could not be loaded. Please try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('BusListing')}
          >
            <Text style={styles.backButtonText}>View All Buses</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const busImages = getAllVehicleImages(bus, 'Bus');

  return (
    <View style={styles.container}>
      <Header title="Bus Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Large Image Carousel / Header */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: busImages[activeImageIndex] || getPrimaryVehicleImage(bus, 'Bus') }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {busImages.length > 1 && (
            <View style={styles.carouselPills}>
              {busImages.map((imgUri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setActiveImageIndex(idx)}
                  style={[
                    styles.indicatorDot,
                    activeImageIndex === idx && styles.indicatorDotActive
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Multi-Image Thumbnails row if multiple images exist */}
        {busImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailRow}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          >
            {busImages.map((imgUri, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveImageIndex(idx)}
                style={[
                  styles.thumbnailBtn,
                  activeImageIndex === idx && styles.thumbnailBtnActive
                ]}
              >
                <Image source={{ uri: imgUri }} style={styles.thumbnailImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Title and Pricing Card */}
        <View style={styles.contentCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.busTitle}>{bus.vehicleName}</Text>
              <Text style={styles.busNumber}>Reg: {bus.vehicleNumber}</Text>
            </View>
            <View style={styles.farePill}>
              <Text style={styles.farePrice}>₹{bus.fareRate}</Text>
              <Text style={styles.fareSub}>Per Seat</Text>
            </View>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Bus Type</Text>
              <Text style={styles.specVal}>{bus.busDetails?.busType || 'AC Sleeper'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Seat Capacity</Text>
              <Text style={styles.specVal}>{bus.seatingCapacity} Total Seats</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Seat Layout</Text>
              <Text style={styles.specVal}>{bus.busDetails?.seatLayout || '2+1 Sleeper'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Available</Text>
              <Text style={[styles.specVal, { color: '#059669' }]}>
                {bus.busDetails?.availableSeats || bus.seatingCapacity} Seats Left
              </Text>
            </View>
          </View>
        </View>

        {/* Route & Stops Details */}
        <View style={styles.contentCard}>
          <Text style={styles.cardHeader}>Route & Boarding Points</Text>

          {schedule && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8 }}>
              <View>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Departure</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>{schedule.departureTime}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Arrival</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>{schedule.arrivalTime}</Text>
              </View>
            </View>
          )}

          <View style={styles.routeBox}>
            <View style={styles.stopItem}>
              <Ionicons name="radio-button-on" size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>Origin: {schedule?.origin || bus.route?.origin || 'Delhi ISBT'}</Text>
                <Text style={styles.stopSub}>
                  Boarding: {formatPoints(bus.route?.boardingPoints, schedule?.origin || bus.route?.origin || 'ISBT Gate 3')}
                </Text>
              </View>
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.stopItem}>
              <Ionicons name="location" size={16} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>Destination: {schedule?.destination || bus.route?.destination || 'Jaipur Sindhi Camp'}</Text>
                <Text style={styles.stopSub}>
                  Dropping: {formatPoints(bus.route?.droppingPoints, schedule?.destination || bus.route?.destination || 'Platform 4')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Amenities & Compliance */}
        <View style={styles.contentCard}>
          <Text style={styles.cardHeader}>Coach Safety & Amenities</Text>
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityItem}>
              <Ionicons name="snow-outline" size={18} color={COLORS.primary} />
              <Text style={styles.amenityText}>Full Climate AC</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="bed-outline" size={18} color={COLORS.primary} />
              <Text style={styles.amenityText}>Comfort Berth</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
              <Text style={styles.amenityText}>Charging Port</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
              <Text style={styles.amenityText}>RTO Safety Pass</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.barLabel}>Starting From</Text>
          <Text style={styles.barPrice}>₹{bus.fareRate}</Text>
        </View>
        <Button
          title="Select Seat"
          onPress={() => navigation.navigate('BusSeatSelection', { busId: bus._id, bus })}
          style={{ paddingHorizontal: 32 }}
        />
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
    paddingBottom: 100
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  heroImage: {
    width: '100%',
    height: 190,
    borderRadius: 14
  },
  carouselPills: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)'
  },
  indicatorDotActive: {
    backgroundColor: '#ffffff',
    width: 20
  },
  thumbnailRow: {
    marginBottom: 16
  },
  thumbnailBtn: {
    width: 58,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#f1f5f9'
  },
  thumbnailBtnActive: {
    borderColor: COLORS.primary
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  busTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  busNumber: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2
  },
  farePill: {
    alignItems: 'flex-end',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  farePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary
  },
  fareSub: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  specBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10
  },
  specLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  specVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginTop: 2
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 12
  },
  routeBox: {
    gap: 8
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  stopName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  stopSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  dashedLine: {
    width: 2,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginLeft: 7
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    width: '48%'
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  barPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.darkNavy,
    marginTop: 14,
    marginBottom: 6
  },
  errorSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 8
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700'
  }
});

export default BusDetailsScreen;
