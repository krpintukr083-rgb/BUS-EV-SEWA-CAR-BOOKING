import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useBooking } from '../../context/BookingContext';
import { customerService } from '../../services/customerService';
import StatusBadge from '../../components/StatusBadge';
import { COLORS } from '../../constants/colors';
import { getFullImageUrl, getPrimaryVehicleImage } from '../../utils/imageUrl';
import { filterBookingsForLocalDate, formatBookingDate } from '../../utils/bookingDate';

const HomeScreen = ({ navigation }) => {
  const { user } = useCustomerAuth();
  const { resetDraft, updateDraft } = useBooking();
  const [serviceControl, setServiceControl] = useState({ busService: 'Active', evSewaService: 'Active', carService: 'Active' });
  const [popularBuses, setPopularBuses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [recentBooking, setRecentBooking] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [todayBookingsError, setTodayBookingsError] = useState('');
  const [busOffer, setBusOffer] = useState(null);
  const [banners, setBanners] = useState([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [bannerWidth, setBannerWidth] = useState(Dimensions.get('window').width - 40);
  const bannerScrollViewRef = useRef(null);

  // Automatic Banner Carousel Timer (Auto-Scroll every 3.5s)
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setActiveBannerIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % banners.length;
        bannerScrollViewRef.current?.scrollTo({ x: nextIndex * bannerWidth, animated: true });
        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [banners, bannerWidth]);

  const fetchHomeData = useCallback(async () => {
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
        if (bRes && bRes.success) {
          const bookings = Array.isArray(bRes.data?.all) ? bRes.data.all : [];
          if (bookings.length > 0) {
            setRecentBooking(bookings[0]);
          } else {
            setRecentBooking(null);
          }
          setTodayBookings(filterBookingsForLocalDate(bookings));
          setTodayBookingsError('');
        } else {
          setTodayBookingsError('Unable to load today’s bookings.');
        }
      } catch (err) {
        console.log('Error fetching my bookings on Home:', err);
        setTodayBookingsError('Unable to load today’s bookings.');
      }

      // 4. Fetch Bus Offer Configuration (Dynamic Admin-Controlled Discount % — UNTOUCHED)
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

      // 5. Fetch Active Multi-Banners for Customer Home Carousel
      try {
        const bRes = await customerService.getBanners();
        if (bRes && bRes.success && Array.isArray(bRes.data) && bRes.data.length > 0) {
          const activeList = bRes.data.filter(b => (b.status || 'active') === 'active');
          if (activeList.length > 0) {
            setBanners(activeList);
          } else {
            setBanners([]);
          }
        } else {
          // Fallback to busOffer if no separate banner documents exist
          const oRes = await customerService.getBusOffer();
          if (oRes && oRes.success && oRes.data && oRes.data.offerStatus === 'active') {
            setBanners([oRes.data]);
          } else {
            setBanners([]);
          }
        }
      } catch (err) {
        console.log('Error fetching active banners on Home:', err);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchHomeData();
  }, [fetchHomeData]));

  const handleSelectService = (serviceType) => {
    resetDraft();

    if (serviceType === 'Bus') {
      if (serviceControl.busService !== 'Active') {
        Alert.alert('Service Inactive', 'Bus booking service is currently inactive.');
        return;
      }
      updateDraft({ serviceType: 'Bus', bookingMode: 'NORMAL' });
      navigation.navigate('BusSearch');
    } else if (serviceType === 'EV-Sewa') {
      if (serviceControl.evSewaService !== 'Active') {
        Alert.alert('Service Inactive', 'EV-Sewa electric shuttle service is currently inactive.');
        return;
      }
      updateDraft({ serviceType: 'EV-Sewa', bookingMode: 'NORMAL' });
      navigation.navigate('EvSewaListing');
    } else if (serviceType === 'Car') {
      if (serviceControl.carService !== 'Active') {
        Alert.alert('Service Inactive', 'Car booking service is currently inactive.');
        return;
      }
      updateDraft({ serviceType: 'Car', bookingMode: 'NORMAL' });
      navigation.navigate('CarListing');
    }
  };

  const startBooking = bookingMode => {
    resetDraft();
    updateDraft({ bookingMode });
    if (bookingMode === 'INSTANT') {
      navigation.getParent()?.navigate('InstantBookingRoute');
    } else {
      navigation.getParent()?.navigate('BookingServiceSelection', { bookingMode });
    }
  };

  const handleViewBus = (bus) => {
    updateDraft({
      serviceType: 'Bus',
      bookingMode: 'NORMAL',
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
        {/* Promotional Multi-Banner Carousel (Admin Controlled) */}
        {banners.length > 0 && (
          <View
            style={styles.heroBannerCard}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && w !== bannerWidth) {
                setBannerWidth(w);
              }
            }}
          >
            <ScrollView
              ref={bannerScrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const contentOffset = e.nativeEvent.contentOffset.x;
                const layoutWidth = bannerWidth || e.nativeEvent.layoutMeasurement.width;
                if (layoutWidth > 0) {
                  const currentIndex = Math.round(contentOffset / layoutWidth);
                  setActiveBannerIndex(currentIndex);
                }
              }}
              scrollEventThrottle={16}
            >
              {banners.map((item, idx) => {
                const imgUri = item.imageUrl || item.bannerImage;
                return (
                  <TouchableOpacity
                    key={item._id || idx}
                    style={{ width: bannerWidth, height: 160, position: 'relative' }}
                    onPress={() => handleSelectService('Bus')}
                    activeOpacity={0.9}
                  >
                    {imgUri ? (
                      <Image
                        source={{ uri: getFullImageUrl(imgUri) }}
                        style={styles.heroBannerFullImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.heroBannerContent, { padding: 16, backgroundColor: '#1e293b', height: '100%', borderRadius: 16 }]}>
                        <View style={styles.heroBannerBadge}>
                          <Ionicons name="sparkles" size={13} color="#f59e0b" />
                          <Text style={styles.heroBannerBadgeText}>PROMOTIONAL OFFER</Text>
                        </View>
                        <Text style={styles.heroBannerTitle}>
                          {item.title || 'Travel Nepal With TravelSewa'}
                        </Text>
                        <Text style={styles.heroBannerSubtitle}>
                          {item.subtitle || 'Book your journey today with verified luxury fleet'}
                        </Text>
                        <View style={styles.heroBannerCtaBtn}>
                          <Text style={styles.heroBannerCtaText}>Book Bus Tickets</Text>
                          <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Dynamic Carousel Indicators */}
            {banners.length > 1 && (
              <View style={styles.carouselDotsContainer}>
                {banners.map((_, dotIdx) => (
                  <View
                    key={dotIdx}
                    style={[
                      styles.carouselDot,
                      activeBannerIndex === dotIdx && styles.carouselDotActive
                    ]}
                  />
                ))}
              </View>
            )}
            {banners.length === 1 && (
              <View style={styles.carouselDotsContainer}>
                <View style={[styles.carouselDot, styles.carouselDotActive]} />
                <View style={styles.carouselDot} />
                <View style={styles.carouselDot} />
              </View>
            )}
          </View>
        )}

        {/* Booking Entry Choices */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>How do you want to book?</Text>
          <Text style={styles.sectionSubtitle}>Choose a planned journey or find a vehicle available now.</Text>
        </View>

        <View style={styles.bookingChoices}>
          <TouchableOpacity
            style={[styles.bookingChoice, styles.scheduleChoice]}
            onPress={() => startBooking('NORMAL')}
            activeOpacity={0.85}
          >
            <View style={[styles.bookingChoiceIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="calendar" size={23} color={COLORS.primary} />
            </View>
            <View style={styles.bookingChoiceCopy}>
              <Text style={styles.bookingChoiceTitle}>Schedule Booking</Text>
              <Text style={styles.bookingChoiceSubtitle}>Plan your trip</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bookingChoice, styles.instantChoice]}
            onPress={() => startBooking('INSTANT')}
            activeOpacity={0.85}
          >
            <View style={[styles.bookingChoiceIcon, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="flash" size={23} color={COLORS.success} />
            </View>
            <View style={styles.bookingChoiceCopy}>
              <Text style={styles.bookingChoiceTitle}>Instant Booking</Text>
              <Text style={styles.bookingChoiceSubtitle}>Need a vehicle now?</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.success} />
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

        <View style={styles.todayBookingsSection}>
          <Text style={styles.todayBookingsTitle}>Today&apos;s Bookings</Text>
          {todayBookingsError ? (
            <View style={styles.todayBookingsEmpty}>
              <Text style={styles.todayBookingsEmptyText}>{todayBookingsError}</Text>
            </View>
          ) : todayBookings.length === 0 ? (
            <View style={styles.todayBookingsEmpty}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.textSecondary} />
              <Text style={styles.todayBookingsEmptyText}>No bookings for today</Text>
            </View>
          ) : (
            todayBookings.map(booking => (
              <View key={booking._id || booking.bookingId} style={styles.todayBookingCard}>
                <View style={styles.todayBookingHeader}>
                  <View style={styles.todayBookingHeaderText}>
                    <Text style={styles.todayBookingId}>{booking.bookingId}</Text>
                    <Text style={styles.todayBookingService}>{booking.serviceType}</Text>
                  </View>
                  <StatusBadge status={booking.bookingStatus} />
                </View>

                <View style={styles.todayBookingRouteRow}>
                  <Ionicons name="radio-button-on" size={14} color={COLORS.primary} />
                  <Text style={styles.todayBookingRouteText} numberOfLines={1}>
                    From: {booking.pickupLocation || '—'}
                  </Text>
                </View>
                <View style={styles.todayBookingRouteRow}>
                  <Ionicons name="location" size={14} color="#ef4444" />
                  <Text style={styles.todayBookingRouteText} numberOfLines={1}>
                    To: {booking.dropLocation || '—'}
                  </Text>
                </View>

                <View style={styles.todayBookingFooter}>
                  <View>
                    <Text style={styles.todayBookingDateLabel}>Travel date</Text>
                    <Text style={styles.todayBookingDate}>{formatBookingDate(booking.travelDate)}</Text>
                  </View>
                  <View style={styles.todayBookingFareContainer}>
                    <Text style={styles.todayBookingDateLabel}>Fare</Text>
                    <Text style={styles.todayBookingFare}>₹{booking.fare ?? booking.finalFare ?? 0}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.todayBookingAction}
                  onPress={() => navigation.navigate('BookingDetails', { bookingId: booking._id || booking.bookingId })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.todayBookingActionText}>View Booking</Text>
                  <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

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
                      uri: getPrimaryVehicleImage(bus, 'Bus')
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
                            {bus.route?.departureTime || 'Scheduled'}{bus.route?.arrivalTime ? ` → ${bus.route.arrivalTime}` : ''}
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
  bookingChoices: {
    gap: 10,
    marginBottom: 20
  },
  bookingChoice: {
    minHeight: 76,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  scheduleChoice: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  instantChoice: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success
  },
  bookingChoiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  bookingChoiceCopy: {
    flex: 1
  },
  bookingChoiceTitle: {
    color: COLORS.darkNavy,
    fontSize: 15,
    fontWeight: '800'
  },
  bookingChoiceSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3
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
  todayBookingsSection: {
    marginTop: -4,
    marginBottom: 20
  },
  todayBookingsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy,
    marginBottom: 12
  },
  todayBookingsEmpty: {
    minHeight: 72,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  todayBookingsEmptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  todayBookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  todayBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8
  },
  todayBookingHeaderText: {
    flex: 1
  },
  todayBookingId: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800'
  },
  todayBookingService: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3
  },
  todayBookingRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3
  },
  todayBookingRouteText: {
    flex: 1,
    color: COLORS.darkNavy,
    fontSize: 12,
    fontWeight: '600'
  },
  todayBookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  todayBookingDateLabel: {
    color: COLORS.textSecondary,
    fontSize: 10
  },
  todayBookingDate: {
    color: COLORS.darkNavy,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  todayBookingFareContainer: {
    alignItems: 'flex-end'
  },
  todayBookingFare: {
    color: COLORS.darkNavy,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2
  },
  todayBookingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
    gap: 4
  },
  todayBookingActionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700'
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
