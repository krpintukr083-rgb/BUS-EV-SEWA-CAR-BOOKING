import React, { useState, useEffect, useRef, useMemo } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { generatePassengerManifestPdf } from '../utils/passengerManifestPdf';
import {
  Bus,
  Zap,
  Car,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Users,
  Eye,
  X,
  Phone,
  Mail,
  User,
  AlertTriangle,
  RotateCw,
  ChevronRight,
  Shield,
  Layers,
  FileDown,
  CheckCircle
} from 'lucide-react';

const BusPassengerManifest = () => {
  // 1. Filter and Search States
  const [selectedServiceType, setSelectedServiceType] = useState('All');
  const [vehicles, setVehicles] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [selectedJourneyKey, setSelectedJourneyKey] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedTravelDate, setSelectedTravelDate] = useState('');
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [passengerSearch, setPassengerSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterBoardingPoint, setFilterBoardingPoint] = useState('All');

  // 2. Data States
  const [manifestData, setManifestData] = useState([]);
  const [manifestSummary, setManifestSummary] = useState(null);
  const [journeyInfo, setJourneyInfo] = useState(null);

  // 3. UI Status States
  const [loadingJourneys, setLoadingJourneys] = useState(true);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [error, setError] = useState('');
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);
  const [nonBusMatch, setNonBusMatch] = useState(null);
  const [bookingNotFound, setBookingNotFound] = useState(false);
  const [searchedBookingId, setSearchedBookingId] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfNotification, setPdfNotification] = useState(null);

  // Debouncing & race-condition refs
  const isFirstRender = useRef(true);
  const lastRegistrationRef = useRef('');
  const requestSeqRef = useRef(0);

  // Render Service Icon & Badge helper
  const renderServiceBadge = (serviceType, size = 11) => {
    const s = String(serviceType || '').toLowerCase();
    if (s === 'ev-sewa' || s === 'ev') {
      return (
        <span className="service-pill-badge service-ev">
          <Zap size={size} /> EV-Sewa
        </span>
      );
    }
    if (s === 'car') {
      return (
        <span className="service-pill-badge service-car">
          <Car size={size} /> Car
        </span>
      );
    }
    return (
      <span className="service-pill-badge service-bus">
        <Bus size={size} /> Bus
      </span>
    );
  };

  // Fetch Journeys List (Buses, EV-Sewa, Cars, schedules, trips)
  const fetchJourneys = async (
    queryService = selectedServiceType,
    queryDate = selectedTravelDate,
    vehicleId = selectedVehicleId,
    regSearchVal = registrationSearch
  ) => {
    const currentSeq = ++requestSeqRef.current;
    try {
      setLoadingJourneys(true);
      setError('');
      setNonBusMatch(null);
      setBookingNotFound(false);
      setSearchedBookingId('');
      const params = {};
      if (queryService && queryService !== 'All') params.serviceType = queryService;
      if (queryDate) params.travelDate = queryDate;
      if (vehicleId) params.vehicleId = vehicleId;
      if (regSearchVal && regSearchVal.trim()) params.vehicleRegistration = regSearchVal.trim();

      const res = await adminService.getBusManifestJourneys(params);

      // Race-condition guard: ignore outdated response if a newer query was issued
      if (currentSeq !== requestSeqRef.current) {
        return;
      }

      if (res && res.success) {
        if (Array.isArray(res.vehicles) && res.vehicles.length > 0) {
          setVehicles(prev => {
            const map = new Map((prev || []).map(v => [v._id.toString(), v]));
            res.vehicles.forEach(v => map.set(v._id.toString(), v));
            return Array.from(map.values());
          });
        } else if (Array.isArray(res.buses) && res.buses.length > 0) {
          setVehicles(prev => {
            const map = new Map((prev || []).map(v => [v._id.toString(), v]));
            res.buses.forEach(v => map.set(v._id.toString(), v));
            return Array.from(map.values());
          });
        }

        if (res.nonBusMatch) setNonBusMatch(res.nonBusMatch);
        if (res.bookingNotFound) {
          setBookingNotFound(true);
          setSearchedBookingId(res.searchedBookingId || '');
        }

        let rawJourneys = Array.isArray(res.data) ? res.data : [];

        // Client-side strict service type isolation
        if (queryService && queryService !== 'All' && queryService !== 'All Services') {
          const normTarget = queryService.toLowerCase().replace(/[-_\s]/g, '');
          rawJourneys = rawJourneys.filter(j => {
            const jType = (j.serviceType || j.vehicleType || '').toLowerCase().replace(/[-_\s]/g, '');
            if (normTarget === 'evsewa' || normTarget === 'ev') {
              return jType === 'evsewa' || jType === 'ev';
            }
            return jType === normTarget;
          });
        }

        // Client-side strict registration search matching
        if (regSearchVal && regSearchVal.trim()) {
          const rNorm = regSearchVal.trim().toLowerCase().replace(/[\s\-_/\\,.]/g, '');
          rawJourneys = rawJourneys.filter(j => {
            const num = (j.vehicleNumber || '').toLowerCase().replace(/[\s\-_/\\,.]/g, '');
            const rc = (j.rcNumber || '').toLowerCase().replace(/[\s\-_/\\,.]/g, '');
            const name = (j.vehicleName || '').toLowerCase().replace(/[\s\-_/\\,.]/g, '');
            return num.includes(rNorm) || rc.includes(rNorm) || name.includes(rNorm);
          });
        }

        setJourneys(rawJourneys);

        // When a match exists, display/select the corresponding journey and show its passenger manifest
        if (rawJourneys.length > 0) {
          let targetJourney = null;
          if (regSearchVal && regSearchVal.trim()) {
            const rNorm = regSearchVal.trim().toLowerCase().replace(/[\s\-_/\\,.]/g, '');
            targetJourney = rawJourneys.find(j => {
              const num = (j.vehicleNumber || '').toLowerCase().replace(/[\s\-_/\\,.]/g, '');
              const rc = (j.rcNumber || '').toLowerCase().replace(/[\s\-_/\\,.]/g, '');
              return num.includes(rNorm) || rc.includes(rNorm);
            }) || rawJourneys[0];
          } else {
            targetJourney = rawJourneys.find(j => j.journeyKey === selectedJourneyKey) || rawJourneys[0];
          }

          setSelectedJourneyKey(targetJourney.journeyKey);
          loadManifestForJourney(targetJourney);

          if (res.matchedBookingId) {
            setPassengerSearch(res.matchedBookingId);
          }
        } else {
          // Zero matching journeys: cleanly clear manifest state and selection
          setSelectedJourneyKey('');
          setManifestData([]);
          setJourneyInfo(null);
          setManifestSummary(null);
          setPassengerSearch('');
        }
      } else {
        setError(res?.message || 'Failed to load journeys.');
        setJourneys([]);
        setSelectedJourneyKey('');
        setManifestData([]);
        setJourneyInfo(null);
        setManifestSummary(null);
        setPassengerSearch('');
      }
    } catch (err) {
      if (currentSeq !== requestSeqRef.current) {
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Error fetching journeys.');
      setJourneys([]);
      setSelectedJourneyKey('');
      setManifestData([]);
      setJourneyInfo(null);
      setManifestSummary(null);
      setPassengerSearch('');
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setLoadingJourneys(false);
      }
    }
  };

  // Debounced search for dedicated vehicle registration input (350ms)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastRegistrationRef.current = registrationSearch;
      return;
    }

    const timer = setTimeout(() => {
      if (registrationSearch !== lastRegistrationRef.current) {
        lastRegistrationRef.current = registrationSearch;
        fetchJourneys(selectedServiceType, selectedTravelDate, selectedVehicleId, registrationSearch);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [registrationSearch]);

  const handleClearRegistrationSearch = () => {
    setRegistrationSearch('');
    setSelectedJourneyKey('');
    setJourneys([]);
    setManifestData([]);
    setJourneyInfo(null);
    setManifestSummary(null);
    lastRegistrationRef.current = '';
    fetchJourneys(selectedServiceType, selectedTravelDate, selectedVehicleId, '');
  };

  const handleClearAllFilters = () => {
    setSelectedServiceType('All');
    setSelectedVehicleId('');
    setSelectedTravelDate('');
    setRegistrationSearch('');
    setPassengerSearch('');
    setSelectedJourneyKey('');
    setJourneys([]);
    setManifestData([]);
    setJourneyInfo(null);
    setManifestSummary(null);
    setBookingNotFound(false);
    setSearchedBookingId('');
    lastRegistrationRef.current = '';
    fetchJourneys('All', '', '', '');
  };

  // Load Manifest Passengers for a selected journey
  const loadManifestForJourney = async (journey) => {
    if (!journey || !journey.vehicleId) return;
    try {
      setLoadingManifest(true);
      setError('');
      const params = {
        vehicleId: journey.vehicleId,
        travelDate: journey.travelDate !== 'All Dates' ? journey.travelDate : undefined,
        scheduleId: journey.scheduleId || undefined,
        serviceType: journey.serviceType || journey.vehicleType || undefined,
        status: filterStatus !== 'All' ? filterStatus : undefined,
        boardingPoint: filterBoardingPoint !== 'All' ? filterBoardingPoint : undefined
      };

      const res = await adminService.getBusPassengerManifest(params);
      if (res && res.success) {
        setManifestData(res.data || []);
        setManifestSummary(res.summary || null);
        setJourneyInfo(res.journeyInfo || null);
      } else {
        setError(res?.message || 'Failed to load passenger manifest.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error loading manifest details.');
    } finally {
      setLoadingManifest(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchJourneys();
  }, []);

  // When selected journey changes by clicking on list
  const handleSelectJourney = (journey) => {
    setSelectedJourneyKey(journey.journeyKey);
    loadManifestForJourney(journey);
  };

  // When filters (status, boarding point) change, re-fetch active journey manifest
  useEffect(() => {
    if (selectedJourneyKey) {
      const activeJourney = journeys.find(j => j.journeyKey === selectedJourneyKey);
      if (activeJourney) {
        loadManifestForJourney(activeJourney);
      }
    }
  }, [filterStatus, filterBoardingPoint]);

  // Auto-dismiss PDF notification
  useEffect(() => {
    if (pdfNotification) {
      const timer = setTimeout(() => setPdfNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pdfNotification]);

  // Professional PDF Manifest Export Handler
  const handleExportPdf = async () => {
    const active = journeys.find(j => j.journeyKey === selectedJourneyKey) || null;
    if (!active) {
      setPdfNotification({
        type: 'error',
        message: 'Please select a journey from the list before exporting the manifest.'
      });
      return;
    }

    const rowsToExport = displayedManifestRows && displayedManifestRows.length > 0
      ? displayedManifestRows
      : manifestData;

    if (!rowsToExport || rowsToExport.length === 0) {
      setPdfNotification({
        type: 'error',
        message: 'No passenger or booking records are available to export for this journey.'
      });
      return;
    }

    const isFiltered = Boolean(
      (passengerSearch && passengerSearch.trim()) ||
      (filterStatus && filterStatus !== 'All') ||
      (filterBoardingPoint && filterBoardingPoint !== 'All')
    );

    try {
      setIsExportingPdf(true);
      setPdfNotification(null);

      const result = await generatePassengerManifestPdf({
        journey: active,
        passengers: rowsToExport,
        summary: manifestSummary,
        filterInfo: isFiltered
          ? {
              isFiltered: true,
              status: filterStatus,
              boardingPoint: filterBoardingPoint,
              search: passengerSearch.trim(),
              totalRecords: manifestData.length
            }
          : null
      });

      setPdfNotification({
        type: 'success',
        message: `Passenger Manifest PDF "${result.filename}" exported successfully (${result.totalPassengers} passengers, ${result.totalPages} page${result.totalPages === 1 ? '' : 's'}).`
      });
    } catch (err) {
      setPdfNotification({
        type: 'error',
        message: err.message || 'Failed to export passenger manifest PDF.'
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Client-side immediate filtering across passenger rows as user types
  const displayedManifestRows = useMemo(() => {
    if (!manifestData || manifestData.length === 0) return [];
    const query = (passengerSearch || '').trim();
    if (!query) return manifestData;

    const qLower = query.toLowerCase();
    const normalize = str => (str ? String(str).toLowerCase().replace(/[\s\-_/\\,.]/g, '') : '');
    const qNorm = normalize(query);

    return manifestData.filter(row => {
      // 1. Booking ID matching
      const bookingId = row.bookingId ? String(row.bookingId).toLowerCase() : '';
      const bookingRef = row.bookingReference ? String(row.bookingReference).toLowerCase() : '';
      const normBookingId = normalize(row.bookingId);
      const normBookingRef = normalize(row.bookingReference);

      const matchesBookingId =
        bookingId.includes(qLower) ||
        bookingRef.includes(qLower) ||
        (Boolean(qNorm) && (normBookingId.includes(qNorm) || normBookingRef.includes(qNorm)));

      // 2. Passenger Name
      const passengerName = row.passengerName ? String(row.passengerName).toLowerCase() : '';
      const normPassengerName = normalize(row.passengerName);
      const matchesName =
        passengerName.includes(qLower) ||
        (Boolean(qNorm) && normPassengerName.includes(qNorm));

      // 3. Seat Number (specific assigned seat, or booking seats if unassigned)
      const seatNumber = row.seatNumber ? String(row.seatNumber).toLowerCase() : '';
      const normSeatNumber = normalize(row.seatNumber);
      const isSeatUnassigned = !row.seatNumber || row.seatNumber === 'N/A' || row.seatNumber === 'Unassigned';
      const matchesSeat =
        seatNumber.includes(qLower) ||
        (Boolean(qNorm) && normSeatNumber.includes(qNorm)) ||
        (isSeatUnassigned &&
          Array.isArray(row.allBookingSeats) &&
          row.allBookingSeats.some(s => {
            const sLower = String(s).toLowerCase();
            return sLower.includes(qLower) || (Boolean(qNorm) && normalize(s).includes(qNorm));
          }));

      // 4. Mobile Number
      const mobileNumber = row.mobileNumber ? String(row.mobileNumber).toLowerCase() : '';
      const normMobile = normalize(row.mobileNumber);
      const matchesMobile =
        mobileNumber.includes(qLower) ||
        (Boolean(qNorm) && normMobile.includes(qNorm));

      // 5. Driver / Pickup / Drop
      const driver = row.assignedDriver ? String(row.assignedDriver).toLowerCase() : '';
      const pickup = row.pickupLocation ? String(row.pickupLocation).toLowerCase() : '';
      const drop = row.dropLocation ? String(row.dropLocation).toLowerCase() : '';
      const matchesLocationOrDriver =
        driver.includes(qLower) ||
        pickup.includes(qLower) ||
        drop.includes(qLower);

      return Boolean(matchesBookingId || matchesName || matchesSeat || matchesMobile || matchesLocationOrDriver);
    });
  }, [manifestData, passengerSearch]);

  const activeJourney = journeys.find(j => j.journeyKey === selectedJourneyKey) || null;
  const isBusActive = activeJourney && (activeJourney.serviceType === 'Bus' || activeJourney.vehicleType === 'Bus');
  const isEvActive = activeJourney && (activeJourney.serviceType === 'EV-Sewa' || activeJourney.vehicleType === 'EV-Sewa');
  const isCarActive = activeJourney && (activeJourney.serviceType === 'Car' || activeJourney.vehicleType === 'Car');

  // Filter available vehicle options based strictly on selectedServiceType so the dropdown retains the full fleet
  const filteredVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];
    if (!selectedServiceType || selectedServiceType === 'All' || selectedServiceType === 'All Services') {
      return vehicles;
    }
    const targetService = selectedServiceType.toLowerCase().replace(/[-_\s]/g, '');
    return vehicles.filter(v => {
      const vType = (v.vehicleType || v.serviceType || '').toLowerCase().replace(/[-_\s]/g, '');
      if (targetService === 'evsewa' || targetService === 'ev') {
        return vType === 'evsewa' || vType === 'ev';
      }
      return vType === targetService;
    });
  }, [vehicles, selectedServiceType]);

  return (
    <div className="manifest-page-wrapper">
      {/* 1. Page Header & Refresh Action */}
      <div className="manifest-header">
        <div className="manifest-title-area">
          <h1 className="manifest-title">
            <Users size={24} style={{ color: 'var(--primary-blue)' }} />
            Passenger Manifest
          </h1>
          <p className="manifest-subtitle">
            Unified passenger and journey manifest for <strong>Bus, EV-Sewa and Car</strong> services. Inspect passenger lists, vehicle allocations, assigned drivers, and live journey statuses.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleExportPdf}
            disabled={!activeJourney || manifestData.length === 0 || loadingManifest || isExportingPdf}
            title={
              !activeJourney
                ? 'Select a journey first'
                : manifestData.length === 0
                ? 'No passenger records to export'
                : 'Export official PDF manifest'
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '40px',
              fontWeight: '600'
            }}
          >
            {isExportingPdf ? (
              <RotateCw size={15} className="spin" />
            ) : (
              <FileDown size={16} />
            )}
            <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>

          <button
            className="btn btn-outline"
            onClick={() => fetchJourneys()}
            disabled={loadingJourneys || loadingManifest}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px' }}
          >
            <RotateCw size={15} className={loadingJourneys || loadingManifest ? 'spin' : ''} />
            <span>Refresh Manifest</span>
          </button>
        </div>
      </div>

      {/* PDF Export Success/Error Notification Banner */}
      {pdfNotification && (
        <div
          style={{
            backgroundColor: pdfNotification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${pdfNotification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: pdfNotification.type === 'success' ? '#065f46' : '#991b1b',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.86rem',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            marginBottom: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {pdfNotification.type === 'success' ? (
              <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            )}
            <span>{pdfNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: pdfNotification.type === 'success' ? '#065f46' : '#991b1b',
              padding: '2px',
              display: 'flex'
            }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: 'var(--status-blocked-bg)',
            border: '1px solid #fecaca',
            color: 'var(--status-blocked)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem',
            fontWeight: '500'
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Cross-Service Discovery Banner */}
      {nonBusMatch && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.85rem',
            fontWeight: '500'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
            <span>
              Booking <strong>{nonBusMatch.bookingId}</strong> was located under <strong>{nonBusMatch.serviceType}</strong> service. Displaying journey & manifest details below.
            </span>
          </div>
          {selectedServiceType !== nonBusMatch.serviceType && (
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.78rem', padding: '4px 10px', height: 'auto', minHeight: '30px' }}
              onClick={() => {
                setSelectedServiceType(nonBusMatch.serviceType);
                setSelectedVehicleId('');
                fetchJourneys(nonBusMatch.serviceType, selectedTravelDate, '', registrationSearch);
              }}
            >
              Switch Tab to {nonBusMatch.serviceType}
            </button>
          )}
        </div>
      )}

      {/* Booking Not Found Banner */}
      {bookingNotFound && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.85rem',
            fontWeight: '500'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <span>
              No trips or bookings were found{searchedBookingId ? <> matching ID <strong>{searchedBookingId}</strong></> : '.'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedServiceType !== 'All' && (
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.78rem', padding: '4px 10px', height: 'auto', minHeight: '30px' }}
                onClick={() => {
                  setSelectedServiceType('All');
                  setSelectedVehicleId('');
                  fetchJourneys('All', selectedTravelDate, '', registrationSearch);
                }}
              >
                Search in All Services
              </button>
            )}
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.78rem', padding: '4px 10px', height: 'auto', minHeight: '30px' }}
              onClick={handleClearAllFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Filter Controls: Service Type, Vehicle Reg Search, Vehicle Dropdown, Journey Date, Action Buttons */}
      <div className="manifest-filter-card">
        <div className="manifest-filter-grid">
          {/* 1. Service Type Filter */}
          <div className="manifest-filter-field">
            <label className="manifest-filter-label">Service Type</label>
            <select
              className="select-field"
              style={{ minHeight: '42px', fontWeight: '600' }}
              value={selectedServiceType}
              onChange={e => {
                const newService = e.target.value;
                setSelectedServiceType(newService);
                setSelectedVehicleId('');
                setSelectedJourneyKey('');
                setJourneys([]);
                setManifestData([]);
                setJourneyInfo(null);
                setManifestSummary(null);
                setBookingNotFound(false);
                fetchJourneys(newService, selectedTravelDate, '', registrationSearch);
              }}
            >
              <option value="All">All Services (Bus, EV, Car)</option>
              <option value="Bus">Bus</option>
              <option value="EV-Sewa">EV-Sewa</option>
              <option value="Car">Car</option>
            </select>
          </div>

          {/* 2. Search Vehicle Registration */}
          <div className="manifest-filter-field">
            <label className="manifest-filter-label">Search Vehicle Registration</label>
            <div style={{ position: 'relative' }}>
              <Car
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-light)',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                className="input-field"
                style={{
                  paddingLeft: '38px',
                  paddingRight: (loadingJourneys || registrationSearch) ? '42px' : '14px',
                  minHeight: '42px'
                }}
                placeholder="Enter vehicle number (e.g. BA 2 KHA 7788)"
                value={registrationSearch}
                onChange={e => {
                  const val = e.target.value;
                  setRegistrationSearch(val);
                  // Registration search works independently: reset dropdown selection so both do not conflict
                  if (selectedVehicleId) {
                    setSelectedVehicleId('');
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    lastRegistrationRef.current = registrationSearch;
                    fetchJourneys(selectedServiceType, selectedTravelDate, selectedVehicleId, registrationSearch);
                  }
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {loadingJourneys && (
                  <RotateCw
                    size={14}
                    className="spin"
                    style={{ color: 'var(--primary-blue)', flexShrink: 0 }}
                  />
                )}
                {registrationSearch && (
                  <button
                    type="button"
                    onClick={handleClearRegistrationSearch}
                    title="Clear registration search"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      borderRadius: '50%'
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Vehicle Registration Dropdown */}
          <div className="manifest-filter-field">
            <label className="manifest-filter-label">Vehicle Dropdown</label>
            <select
              className="select-field"
              style={{ minHeight: '42px' }}
              value={selectedVehicleId}
              onChange={e => {
                const newVehId = e.target.value;
                setSelectedVehicleId(newVehId);
                // Selecting a vehicle from dropdown works independently: clear typed registration search
                setRegistrationSearch('');
                lastRegistrationRef.current = '';
                setSelectedJourneyKey('');
                setJourneys([]);
                setManifestData([]);
                setJourneyInfo(null);
                setManifestSummary(null);
                fetchJourneys(selectedServiceType, selectedTravelDate, newVehId, '');
              }}
            >
              <option value="">
                {selectedServiceType === 'All'
                  ? `All Registered Vehicles (${filteredVehicles.length})`
                  : `All ${selectedServiceType} Vehicles (${filteredVehicles.length})`}
              </option>
              {filteredVehicles.map(v => (
                <option key={v._id} value={v._id}>
                  {v.vehicleNumber} — {v.vehicleName} ({v.vehicleType || 'Bus'})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Journey Date Filter */}
          <div className="manifest-filter-field">
            <label className="manifest-filter-label">Journey Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-light)',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="date"
                className="input-field"
                style={{ paddingLeft: '38px', minHeight: '42px' }}
                value={selectedTravelDate}
                onChange={e => {
                  const newDate = e.target.value;
                  setSelectedTravelDate(newDate);
                  fetchJourneys(selectedServiceType, newDate, selectedVehicleId, registrationSearch);
                }}
              />
            </div>
          </div>

          {/* 5 & 6. Action Buttons: Apply Filter and Clear */}
          <div className="manifest-filter-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                lastRegistrationRef.current = registrationSearch;
                fetchJourneys(selectedServiceType, selectedTravelDate, selectedVehicleId, registrationSearch);
              }}
              disabled={loadingJourneys}
            >
              Apply Filter
            </button>
            {(selectedServiceType !== 'All' || selectedVehicleId || selectedTravelDate || registrationSearch) && (
              <button
                className="btn btn-outline"
                onClick={handleClearAllFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Journeys & Active Manifest */}
      <div className="manifest-workspace-grid">
        
        {/* Left Column: Journeys & Trips Selection List */}
        <div className="manifest-journey-card">
          <div className="manifest-journey-header">
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)' }}>
                Journeys & Trips
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {journeys.length} trip{journeys.length === 1 ? '' : 's'} available
                {selectedServiceType !== 'All' ? ` (${selectedServiceType})` : ''}
              </div>
            </div>
          </div>

          {loadingJourneys ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <RotateCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--primary-blue)' }} />
              Loading journeys...
            </div>
          ) : journeys.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Layers size={36} style={{ color: 'var(--text-light)', margin: '0 auto 10px', display: 'block', opacity: 0.7 }} />
              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '6px' }}>
                No Matching Journeys Found
              </div>

              {nonBusMatch ? (
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px', margin: '0 0 12px', fontSize: '0.8rem', color: '#1e40af', textAlign: 'left', lineHeight: '1.45' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                    <span>Booking Belongs to {nonBusMatch.serviceType}</span>
                  </div>
                  <div>Booking <code>{nonBusMatch.bookingId}</code> belongs to <strong>{nonBusMatch.serviceType}</strong>. Switch the Service Type filter to <em>All Services</em> or <em>{nonBusMatch.serviceType}</em> to inspect this manifest.</div>
                </div>
              ) : bookingNotFound ? (
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 14px', margin: '0 0 12px', fontSize: '0.8rem', color: '#9a3412', textAlign: 'left', lineHeight: '1.45' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} style={{ color: '#ea580c', flexShrink: 0 }} />
                    <span>No matching booking found</span>
                  </div>
                  <div>No record exists matching <code>{searchedBookingId}</code> across Bus, EV-Sewa or Car services.</div>
                </div>
              ) : (
                <p style={{ margin: '0 0 12px', lineHeight: '1.4', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {registrationSearch || selectedVehicleId || selectedTravelDate || selectedServiceType !== 'All'
                    ? 'No journeys match your active filters.'
                    : 'No scheduled or booked journeys are available.'}
                </p>
              )}

              {(registrationSearch || selectedVehicleId || selectedTravelDate || selectedServiceType !== 'All') && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                    {selectedServiceType !== 'All' && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                        Service: {selectedServiceType}
                      </span>
                    )}
                    {registrationSearch && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                        Registration: "{registrationSearch}"
                      </span>
                    )}
                    {selectedTravelDate && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                        Date: {selectedTravelDate}
                      </span>
                    )}
                    {selectedVehicleId && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                        Vehicle: {vehicles.find(v => v._id === selectedVehicleId)?.vehicleNumber || 'Selected'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleClearAllFilters}
                    style={{ fontSize: '0.76rem', padding: '5px 12px', minHeight: '30px', marginTop: '4px' }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="manifest-journey-list">
              {journeys.map(j => {
                const isSelected = j.journeyKey === selectedJourneyKey;
                return (
                  <div
                    key={j.journeyKey}
                    onClick={() => handleSelectJourney(j)}
                    className={`manifest-journey-item ${isSelected ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {renderServiceBadge(j.serviceType || j.vehicleType, 11)}
                        <span style={{ fontWeight: '800', fontSize: '0.88rem', color: isSelected ? 'var(--primary-blue)' : 'var(--text-main)', letterSpacing: '-0.01em' }}>
                          {j.vehicleNumber}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {j.matchedBookingId && (
                          <span style={{ fontSize: '0.68rem', fontWeight: '750', color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '1px 6px', borderRadius: '4px', letterSpacing: '-0.01em' }}>
                            {j.matchedBookingId}
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {j.travelDate || 'Any Date'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: '600' }}>
                      {j.origin} → {j.destination}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {j.departureTime}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> {j.totalPassengers} Pax ({j.totalBookings} Bkg)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        Driver: {j.driverName}
                      </span>
                      <ChevronRight size={14} style={{ color: isSelected ? 'var(--primary-blue)' : 'var(--text-light)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Journey Passenger Manifest */}
        <div className="manifest-main-content">
          
          {/* Selected Journey Header Info */}
          {activeJourney && (
            <div className="manifest-active-journey-card">
              <div className="manifest-active-journey-inner">
                <div className="manifest-active-journey-primary">
                  <div className="manifest-badges-row">
                    {renderServiceBadge(activeJourney.serviceType || activeJourney.vehicleType, 13)}
                    <span className="manifest-active-reg">{activeJourney.vehicleNumber}</span>
                    <span className="manifest-active-vname">({activeJourney.vehicleName})</span>
                    <StatusBadge status={activeJourney.status || 'Active'} />
                  </div>
                  <div className="manifest-journey-meta-pills">
                    <span className="manifest-meta-item">
                      <MapPin size={15} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                      <span><strong>Route:</strong> {activeJourney.origin} → {activeJourney.destination}</span>
                    </span>
                    <span className="manifest-meta-item">
                      <Calendar size={15} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                      <span><strong>Date:</strong> {activeJourney.travelDate || 'All Dates'}</span>
                    </span>
                    <span className="manifest-meta-item">
                      <Clock size={15} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                      <span><strong>Departure:</strong> {activeJourney.departureTime}</span>
                    </span>
                    {activeJourney.evDetails && activeJourney.evDetails.rangeKm && (
                      <span className="manifest-meta-item" style={{ color: '#059669' }}>
                        <Zap size={14} />
                        <span><strong>Range:</strong> {activeJourney.evDetails.rangeKm} km</span>
                      </span>
                    )}
                    {activeJourney.carDetails && activeJourney.carDetails.fuelType && (
                      <span className="manifest-meta-item" style={{ color: '#6d28d9' }}>
                        <Car size={14} />
                        <span><strong>Fuel:</strong> {activeJourney.carDetails.fuelType}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="manifest-operator-box">
                  <div className="manifest-operator-item">
                    <span className="manifest-op-label">Operator:</span>
                    <span className="manifest-op-value">{activeJourney.operatorName || 'N/A'}</span>
                  </div>
                  <div className="manifest-operator-item">
                    <span className="manifest-op-label">Driver:</span>
                    <span className="manifest-op-value">
                      {activeJourney.driverName || 'Not Assigned'}
                      {activeJourney.driverPhone ? ` (${activeJourney.driverPhone})` : ''}
                    </span>
                  </div>
                  <div className="manifest-operator-item">
                    <span className="manifest-op-label">Capacity:</span>
                    <span className="manifest-op-value">{activeJourney.seatingCapacity} seats</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manifest Filter Toolbar & Summary */}
          {activeJourney && (
            <div className="manifest-subfilter-card">
              <div className="manifest-subfilter-controls">
                {/* Search within manifest */}
                <div className="manifest-subfilter-search-wrap" style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-light)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    className="input-field manifest-subfilter-search-input"
                    placeholder="Search passenger, seat, booking ID, driver..."
                    value={passengerSearch}
                    onChange={e => setPassengerSearch(e.target.value)}
                    style={{ paddingRight: passengerSearch ? '28px' : '10px' }}
                  />
                  {passengerSearch && (
                    <button
                      type="button"
                      onClick={() => setPassengerSearch('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-light)'
                      }}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status filter */}
                <select
                  className="select-field manifest-subfilter-select"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Confirmed">Confirmed / Admin Confirmed</option>
                  <option value="Pending Driver Confirmation">Pending Driver Confirmation</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {/* Boarding Point filter (only for Bus when boardingPoints exist) */}
                {isBusActive && activeJourney.boardingPoints && activeJourney.boardingPoints.length > 0 && (
                  <select
                    className="select-field manifest-subfilter-select"
                    value={filterBoardingPoint}
                    onChange={e => setFilterBoardingPoint(e.target.value)}
                  >
                    <option value="All">All Boarding Points</option>
                    {activeJourney.boardingPoints.map((bp, i) => (
                      <option key={i} value={bp}>{bp}</option>
                    ))}
                  </select>
                )}

                {/* Subfilter Export PDF Button */}
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleExportPdf}
                  disabled={!activeJourney || manifestData.length === 0 || loadingManifest || isExportingPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    padding: '6px 12px',
                    minHeight: '36px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Export official PDF manifest"
                >
                  {isExportingPdf ? (
                    <RotateCw size={13} className="spin" />
                  ) : (
                    <FileDown size={14} />
                  )}
                  <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
                </button>
              </div>

              {/* Compact Manifest Stats */}
              {manifestSummary && (
                <div className="manifest-summary-badges">
                  <span className="manifest-stat-pill total">
                    Total: {passengerSearch.trim() ? displayedManifestRows.length : manifestSummary.totalManifestPassengers}
                  </span>
                  <span className="manifest-stat-pill confirmed">
                    Confirmed: {passengerSearch.trim() ? displayedManifestRows.filter(r => ['Confirmed', 'Admin Confirmed', 'ADMIN_CONFIRMED', 'Completed'].includes(r.bookingStatus)).length : manifestSummary.confirmedCount}
                  </span>
                  <span className="manifest-stat-pill pending">
                    Pending: {passengerSearch.trim() ? displayedManifestRows.filter(r => ['Pending', 'Pending Admin Confirmation', 'Pending Driver Confirmation'].includes(r.bookingStatus)).length : manifestSummary.pendingCount}
                  </span>
                  <span className="manifest-stat-pill cancelled">
                    Cancelled: {passengerSearch.trim() ? displayedManifestRows.filter(r => ['Cancelled', 'Rejected'].includes(r.bookingStatus)).length : manifestSummary.cancelledCount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. Manifest Passenger & Booking Table */}
          <div className="manifest-table-card">
            {loadingManifest ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RotateCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--primary-blue)' }} />
                Loading manifest passengers...
              </div>
            ) : !activeJourney ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Layers size={36} style={{ color: 'var(--text-light)', margin: '0 auto 12px', display: 'block' }} />
                Please select a journey from the list on the left to view its passenger and booking manifest.
              </div>
            ) : displayedManifestRows.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={36} style={{ color: 'var(--text-light)', margin: '0 auto 12px', display: 'block' }} />
                No passengers or bookings found for this trip
              </div>
            ) : (
              <>
                <div className="manifest-table-hint">
                  <span>← Swipe horizontally to view full passenger details →</span>
                </div>
                <div className="manifest-table-container">
                  <table className="manifest-table">
                  <thead>
                    <tr>
                      {/* Adapt columns based on service */}
                      {isBusActive ? (
                        <>
                          <th style={{ width: '70px' }}>Seat</th>
                          <th style={{ minWidth: '160px' }}>Passenger Name</th>
                          <th style={{ width: '100px' }}>Age / Gender</th>
                          <th style={{ minWidth: '120px' }}>Mobile Number</th>
                          <th style={{ minWidth: '125px' }}>Booking ID</th>
                          <th style={{ minWidth: '130px' }}>Boarding Point</th>
                          <th style={{ minWidth: '130px' }}>Destination</th>
                          <th style={{ minWidth: '120px' }}>Booking Status</th>
                          <th style={{ minWidth: '95px' }}>Payment</th>
                          <th style={{ width: '85px', textAlign: 'right' }}>Action</th>
                        </>
                      ) : (
                        <>
                          <th style={{ minWidth: '100px' }}>Service</th>
                          <th style={{ minWidth: '125px' }}>Booking ID</th>
                          <th style={{ minWidth: '160px' }}>Passenger / Customer</th>
                          <th style={{ minWidth: '120px' }}>Contact</th>
                          <th style={{ minWidth: '140px' }}>Pickup Location</th>
                          <th style={{ minWidth: '140px' }}>Drop Location</th>
                          <th style={{ minWidth: '120px' }}>Assigned Driver</th>
                          <th style={{ minWidth: '120px' }}>Booking Status</th>
                          <th style={{ minWidth: '95px' }}>Fare</th>
                          <th style={{ minWidth: '95px' }}>Payment</th>
                          <th style={{ width: '85px', textAlign: 'right' }}>Action</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedManifestRows.map(row => {
                      const isHighlightedBooking = Boolean(
                        passengerSearch && row.bookingId && row.bookingId.toLowerCase().includes(passengerSearch.trim().toLowerCase())
                      );
                      const isRowBus = (row.serviceType || '').toLowerCase() === 'bus';

                      return (
                      <tr key={row.manifestId} style={isHighlightedBooking ? { backgroundColor: '#f0f9ff' } : undefined}>
                        {isBusActive ? (
                          <>
                            <td>
                              <span className="seat-pill">
                                {row.seatNumber || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.84rem' }}>
                                {row.passengerName}
                              </div>
                              {row.isLeadPassenger && row.passengerCountInBooking > 1 && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--primary-blue)', fontWeight: '600' }}>
                                  Lead Passenger ({row.passengerCountInBooking} pax total)
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {row.age !== null ? `${row.age} yrs` : 'N/A'} • {row.gender || 'N/A'}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                              {row.mobileNumber}
                            </td>
                            <td>
                              <span className="booking-ref-code">
                                {row.bookingId}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {row.boardingPoint}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {row.destination}
                            </td>
                            <td>
                              <StatusBadge status={row.bookingStatus} />
                            </td>
                            <td>
                              <StatusBadge status={row.paymentStatus} />
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              {renderServiceBadge(row.serviceType, 11)}
                            </td>
                            <td>
                              <span className="booking-ref-code">
                                {row.bookingId}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '750', color: 'var(--text-main)', fontSize: '0.84rem' }}>
                                {row.passengerName}
                              </div>
                              {row.isLeadPassenger && row.passengerCountInBooking > 1 && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--primary-blue)', fontWeight: '600' }}>
                                  Group Booking ({row.passengerCountInBooking} pax)
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                              {row.mobileNumber}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {row.pickupLocation || row.boardingPoint || 'N/A'}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {row.dropLocation || row.destination || 'N/A'}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                              {row.assignedDriver || 'Unassigned'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <StatusBadge status={row.bookingStatus} />
                                {row.rideStatus && row.rideStatus !== 'None' && (
                                  <span className={`ride-status-pill ${row.rideStatus.toLowerCase()}`}>
                                    Ride: {row.rideStatus}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                              NPR {row.fare}
                            </td>
                            <td>
                              <StatusBadge status={row.paymentStatus} />
                            </td>
                          </>
                        )}

                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-outline"
                            style={{
                              padding: '5px 9px',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              minHeight: '30px'
                            }}
                            onClick={() => setSelectedBookingModal(row)}
                            title="View Booking & Passenger Details"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* 5. Passenger & Booking Details Modal */}
      {selectedBookingModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '620px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {renderServiceBadge(selectedBookingModal.serviceType, 12)}
                  <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <User size={18} style={{ color: 'var(--primary-blue)' }} />
                    Passenger & Booking Information
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Booking ID: {selectedBookingModal.bookingId} • Vehicle: {selectedBookingModal.vehicleNumber || 'N/A'}
                </span>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedBookingModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem' }}>
              {/* Service & Vehicle Details */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Vehicle & Service Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Vehicle Registration</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedBookingModal.vehicleNumber || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Vehicle Model & Name</span>
                    <span>{selectedBookingModal.vehicleModel} ({selectedBookingModal.vehicleCategory || selectedBookingModal.serviceType})</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Assigned Driver</span>
                    <strong style={{ color: 'var(--primary-blue)' }}>{selectedBookingModal.assignedDriver || 'Unassigned'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Driver Mobile</span>
                    <span>{selectedBookingModal.driverPhone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Passenger Core Details */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Passenger Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Full Name</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedBookingModal.passengerName}</strong>
                  </div>
                  {/* Seat only shown meaningfully if Bus or assigned */}
                  {(selectedBookingModal.serviceType === 'Bus' || (selectedBookingModal.seatNumber && selectedBookingModal.seatNumber !== 'N/A')) && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Allocated Seat</span>
                      <strong style={{ color: 'var(--primary-blue)' }}>{selectedBookingModal.seatNumber}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Age / Gender</span>
                    <span>{selectedBookingModal.age ? `${selectedBookingModal.age} years` : 'N/A'} • {selectedBookingModal.gender || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Passenger Count</span>
                    <span>{selectedBookingModal.passengerCountInBooking} passenger(s) in booking</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Contact Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Mobile Number</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                      {selectedBookingModal.mobileNumber}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Email Address</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                      {selectedBookingModal.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Journey & Boarding / Pickup & Drop */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Journey & Route
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Pickup / Boarding Point</span>
                    <strong>{selectedBookingModal.pickupLocation || selectedBookingModal.boardingPoint}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Drop / Destination</span>
                    <strong>{selectedBookingModal.dropLocation || selectedBookingModal.destination}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Journey Date</span>
                    <span>{selectedBookingModal.journeyDate}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Departure Time</span>
                    <span>{selectedBookingModal.departureTime}</span>
                  </div>
                </div>
              </div>

              {/* Booking, Ride & Financial Status */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Booking, Ride & Payment Status
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem', marginBottom: '3px' }}>Booking Status</span>
                    <StatusBadge status={selectedBookingModal.bookingStatus} />
                  </div>
                  {selectedBookingModal.rideStatus && selectedBookingModal.rideStatus !== 'None' && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem', marginBottom: '3px' }}>Ride Status</span>
                      <span className={`ride-status-pill ${selectedBookingModal.rideStatus.toLowerCase()}`}>
                        {selectedBookingModal.rideStatus}
                      </span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem', marginBottom: '3px' }}>Payment Status</span>
                    <StatusBadge status={selectedBookingModal.paymentStatus} />
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Payment Method</span>
                    <span>{selectedBookingModal.paymentMethod}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Recorded Fare</span>
                    <strong>NPR {selectedBookingModal.fare}</strong>
                  </div>
                </div>
              </div>

              {/* Emergency Contact & Special Assistance */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Emergency & Special Assistance
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Emergency Contact</span>
                    {selectedBookingModal.emergencyContact ? (
                      <span>
                        {selectedBookingModal.emergencyContact.name} ({selectedBookingModal.emergencyContact.relationship}) - {selectedBookingModal.emergencyContact.phone}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Not collected</span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Special Assistance Notes</span>
                    {selectedBookingModal.specialAssistanceNotes ? (
                      <span>{selectedBookingModal.specialAssistanceNotes}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>None recorded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end', paddingTop: '14px' }}>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedBookingModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusPassengerManifest;
