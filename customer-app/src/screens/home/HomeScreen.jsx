import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useBooking } from '../../context/BookingContext';
import { customerService } from '../../services/customerService';
import StatusBadge from '../../components/StatusBadge';
import { COLORS } from '../../constants/colors';
import { getFullImageUrl } from '../../utils/imageUrl';

const HomeScreen = ({ navigation }) => {
  const { user } = useCustomerAuth();
  const { resetDraft, updateDraft } = useBooking();
  const [serviceControl, setServiceControl] = useState({ busService: 'Active', evSewaService: 'Active', carService: 'Active' });
  const [popularBuses, setPopularBuses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [recentBooking, setRecentBooking] = useState(null);
  const [busOffer, setBusOffer] = useState(null);

  const fetchHomeData = async () => {
    try {
      // 1. Fetch Popular Buses (Public API)
      try {
        const vRes = await customerService.getBuses();
        if (vRes && vRes.success) {
          const activeBuses = (vRes.data || []).filter(v => (v.vehicleStatus || 'Active') === 'Active');
          setPopularBuses(activeBuses);
        }
      } catch (err) {
        console.log('Error fetching buses on Home:', err);
      }

      // 2. Fetch Service Control
      try {
        const sRes = await customerService.getServicesStatus();
        if (sRes && sRes.success) setServiceControl(sRes.data);
      } catch (err) {
        console.log('Error fetching services status:', err);
      }

      // 3. Fetch Recent Bookings
      try {
        const bRes = await customerService.getMyBookings();
        if (bRes && bRes.success && bRes.data?.all?.length > 0) {
          setRecentBooking(bRes.data.all[0]);
        }
      } catch (err) {
        console.log('Error fetching my bookings on Home:', err);
      }

      // 4. Fetch Bus Offer Configuration (Dynamic Admin-Controlled Discount)
      try {
        const oRes = await customerService.getBusOffer();
        if (oRes && oRes.success && oRes.data) {
          setBusOffer(oRes.data);
        } else {
          setBusOffer(null);
        }
      } catch (err) {
        console.log('Error fetching bus offer on Home:', err);
        setBusOffer(null);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleSelectService = (serviceType) => {
    resetDraft();

    if (serviceType === 'Bus') {
      if (serviceControl.busService !== 'Active') {
        Alert.alert('Service Inactive', 'Bus booking service is currently inactive.');
        return;
      }
      updateDraft({ serviceType: 'Bus' });
      navigation.navigate('BusSearch');
    } else if (serviceType === 'EV-Sewa') {
      if (serviceControl.evSewaService !== 'Active') {
        Alert.alert('Service Inactive', 'EV-Sewa electric shuttle service is currently inactive.');
        return;
      }
      updateDraft({ serviceType: 'EV-Sewa' });
      navigation.navigate('EvSewaListing');
    } else if (serviceType === 'Car') {
      if (serviceControl.carService !== 'Active') {
        Alert.alert('Service Inactive', 'Car booking service is currently inactive.');
        return;
      }
      updateDraft({ serviceType: 'Car' });
      navigation.navigate('CarListing');
    }
  };

  const handleViewBus = (bus) => {
    updateDraft({
      serviceType: 'Bus',
      vehicle: bus,
      baseFare: bus.fareRate,
      pickupLocation: bus.route?.origin || 'Delhi (Kashmere Gate ISBT)',
      dropLocation: bus.route?.destination || 'Jaipur (Sindhi Camp)'
    });
    navigation.navigate('BusDetails', { busId: bus._id, bus });
  };

  return (
    <View style={styles.container}>
      {/* Top App Header with Greeting */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image
              source={{
                uri: user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingSub}>Welcome to</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Customer'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('CustomerSupport')}
          >
            <Ionicons name="help-circle-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHomeData(); }} />}
      >
        {/* Promotional Banner (Admin Controlled Carousel / Banner) */}
        {busOffer && (busOffer.offerStatus === 'active' || busOffer.discountStatus === 'active') && (
          <TouchableOpacity
            style={styles.heroBannerCard}
            onPress={() => handleSelectService('Bus')}
            activeOpacity={0.9}
          >
            {busOffer.bannerImage || busOffer.imageUrl ? (
              <View style={{ position: 'relative', width: '100%', height: 160 }}>
                <Image
                  source={{ uri: getFullImageUrl(busOffer.bannerImage || busOffer.imageUrl) }}
                  style={styles.heroBannerFullImage}
                  resizeMode="cover"
                />
                <View style={styles.carouselDotsContainer}>
                  <View style={[styles.carouselDot, styles.carouselDotActive]} />
                  <View style={styles.carouselDot} />
                  <View style={styles.carouselDot} />
                </View>
              </View>
            ) : (
              <View style={[styles.heroBannerContent, { padding: 16 }]}>
                <View style={styles.heroBannerBadge}>
                  <Ionicons name="sparkles" size={13} color="#f59e0b" />
                  <Text style={styles.heroBannerBadgeText}>PROMOTIONAL OFFER</Text>
                </View>
                <Text style={styles.heroBannerTitle}>
                  {busOffer.offerTitle || 'Travel Nepal With TravelSewa'}
                </Text>
                <Text style={styles.heroBannerSubtitle}>
                  {busOffer.offerSubtitle || 'Book your journey today with verified luxury fleet'}
                </Text>
                <View style={styles.heroBannerCtaBtn}>
                  <Text style={styles.heroBannerCtaText}>Book Bus Tickets</Text>
                  <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Book Your Journey Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Book Your Journey</Text>
          <Text style={styles.sectionSubtitle}>Select your preferred mode of transportation</Text>
        </View>

        {/* 3 Main Service Cards matching reference image */}
        <View style={styles.servicesGrid}>
          {/* Bus Service */}
          <TouchableOpacity
            style={[styles.serviceCard, styles.busCard]}
            onPress={() => handleSelectService('Bus')}
            activeOpacity={0.85}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="bus" size={26} color={COLORS.primary} />
            </View>
            <Text style={styles.serviceTitle}>Bus Service</Text>
            <Text style={styles.serviceDesc}>Intercity & Sleeper</Text>
            {serviceControl.busService !== 'Active' && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* EV-Sewa Service */}
          <TouchableOpacity
            style={[styles.serviceCard, styles.evCard]}
            onPress={() => handleSelectService('EV-Sewa')}
            activeOpacity={0.85}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="flash" size={26} color={COLORS.success} />
            </View>
            <Text style={styles.serviceTitle}>EV-Sewa</Text>
            <Text style={styles.serviceDesc}>Green City Shuttle</Text>
            {serviceControl.evSewaService !== 'Active' && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Car Service */}
          <TouchableOpacity
            style={[styles.serviceCard, styles.carCard]}
            onPress={() => handleSelectService('Car')}
            activeOpacity={0.85}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="car-sport" size={26} color="#ea580c" />
            </View>
            <Text style={styles.serviceTitle}>Car Service</Text>
            <Text style={styles.serviceDesc}>Sedan & SUV Cab</Text>
            {serviceControl.carService !== 'Active' && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* My Bookings Action Card */}
        <TouchableOpacity
          style={styles.myBookingsCard}
          onPress={() => navigation.navigate('MyBookingsTab')}
          activeOpacity={0.85}
        >
          <View style={styles.myBookingsLeft}>
            <View style={styles.bookingsIconBg}>
              <Ionicons name="ticket-outline" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.myBookingsTitle}>My Bookings</Text>
              <Text style={styles.myBookingsSubtitle}>
                {recentBooking ? `Latest: ${recentBooking.bookingId} (${recentBooking.serviceType})` : 'View upcoming & completed tickets'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Recent Booking Snippet if available */}
        {recentBooking && (
          <View style={styles.recentBookingBox}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentLabel}>Active Reservation</Text>
              <StatusBadge status={recentBooking.bookingStatus} />
            </View>
            <Text style={styles.recentRoute}>
              {recentBooking.pickupLocation} → {recentBooking.dropLocation}
            </Text>
            <View style={styles.recentMeta}>
              <Text style={styles.recentFare}>₹{recentBooking.fare}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('DigitalTicket', { bookingId: recentBooking.bookingId })}
              >
                <Text style={styles.viewTicketLink}>View Ticket →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Popular Buses / Available Buses Section */}
        {popularBuses.length > 0 && (
          <View style={styles.popularSection}>
            <View style={styles.popularHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Popular Buses</Text>
                <Text style={styles.sectionSubtitle}>Direct intercity coaches with available seats</Text>
              </View>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('BusListing')}
              >
                <Text style={styles.seeAllText}>View All Buses →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.busListContainer}>
              {popularBuses.map((bus) => (
                <TouchableOpacity
                  key={bus._id}
                  style={styles.homeBusCard}
                  onPress={() => handleViewBus(bus)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{
                      uri: bus.vehicleImages && bus.vehicleImages.length > 0
                        ? bus.vehicleImages[0]
                        : 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
                    }}
                    style={styles.homeBusImage}
                  />

                  <View style={styles.homeBusBody}>
                    {/* Bus Name & Price Header */}
                    <View style={styles.homeBusRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.homeBusName} numberOfLines={1}>
                          {bus.vehicleName}
                        </Text>
                        <Text style={styles.homeBusSub}>
                          {bus.vehicleNumber} • {bus.busDetails?.busType || bus.vehicleCategory}
                        </Text>
                      </View>
                      <View style={styles.homeFarePill}>
                        <Text style={styles.homeFareAmount}>₹{bus.fareRate}</Text>
                        <Text style={styles.homeFareSub}>/ seat</Text>
                      </View>
                    </View>

                    {/* Route & Timing Box */}
                    <View style={styles.homeTimingBox}>
                      <View style={styles.routePillSmall}>
                        <Ionicons name="navigate-circle" size={14} color={COLORS.primary} />
                        <Text style={styles.homeRouteText} numberOfLines={1}>
                          {bus.route?.origin ? bus.route.origin.split('(')[0].trim() : 'Delhi'} → {bus.route?.destination ? bus.route.destination.split('(')[0].trim() : 'Jaipur'}
                        </Text>
                      </View>

                      <View style={styles.timingRow}>
                        <View style={styles.timeItem}>
                          <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                          <Text style={styles.timeText}>
                            {bus.route?.departureTime || '06:00 AM'} → {bus.route?.arrivalTime || '11:30 AM'}
                          </Text>
                        </View>
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>{bus.route?.duration || '5h 30m'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Footer: Seats Available & View Bus CTA */}
                    <View style={styles.homeBusFooter}>
                      <View style={styles.homeSeatsBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.homeSeatsText}>
                          {bus.busDetails?.availableSeats || 32} Seats Available
                        </Text>
                      </View>

                      <View style={styles.viewBusBtn}>
                        <Text style={styles.viewBusBtnText}>Select Seats</Text>
                        <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  topHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  greetingTextContainer: {
    flex: 1
  },
  greetingSub: {
    fontSize: 12,
    color: '#bfdbfe',
    fontWeight: '500'
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  heroBannerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 0,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden'
  },
  heroBannerFullImage: {
    width: '100%',
    height: 160,
    borderRadius: 16
  },
  carouselDotsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6
  },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)'
  },
  carouselDotActive: {
    width: 18,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38bdf8'
  },
  heroBannerContent: {
    flex: 1,
    paddingRight: 12
  },
  heroBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  heroBannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fef08a',
    letterSpacing: 0.5
  },
  heroBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4
  },
  heroBannerSubtitle: {
    fontSize: 11,
    color: '#bfdbfe',
    lineHeight: 16,
    marginBottom: 12
  },
  heroBannerCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  heroBannerCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4
  },
  heroBannerCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  heroBannerOfferText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34d399'
  },
  heroBannerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative'
  },
  busCard: {
    borderTopWidth: 3,
    borderTopColor: COLORS.primary
  },
  evCard: {
    borderTopWidth: 3,
    borderTopColor: COLORS.success
  },
  carCard: {
    borderTopWidth: 3,
    borderTopColor: '#ea580c'
  },
  serviceIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    textAlign: 'center'
  },
  serviceDesc: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2
  },
  inactiveBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  inactiveBadgeText: {
    fontSize: 8,
    color: '#dc2626',
    fontWeight: '700'
  },
  myBookingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20
  },
  myBookingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  bookingsIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  myBookingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  myBookingsSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  recentBookingBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 20
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  recentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase'
  },
  recentRoute: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkNavy,
    marginBottom: 8
  },
  recentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recentFare: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  viewTicketLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary
  },
  popularSection: {
    marginTop: 8,
    marginBottom: 24
  },
  popularHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16
  },
  seeAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary
  },
  busListContainer: {
    gap: 16
  },
  homeBusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3
  },
  homeBusImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9'
  },
  homeBusBody: {
    padding: 16
  },
  homeBusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  homeBusName: {
    fontSize: 16,
    fontWeight: '850',
    color: COLORS.darkNavy
  },
  homeBusSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  homeFarePill: {
    alignItems: 'flex-end',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  homeFareAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary
  },
  homeFareSub: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  homeTimingBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8
  },
  routePillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  homeRouteText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  durationBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  homeBusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  homeSeatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  homeSeatsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669'
  },
  viewBusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  viewBusBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  }
});

export default HomeScreen;
