import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import {
  Bus,
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
  ChevronRight
} from 'lucide-react';

const BusPassengerManifest = () => {
  // 1. Filter and Search States
  const [buses, setBuses] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [selectedJourneyKey, setSelectedJourneyKey] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedTravelDate, setSelectedTravelDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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

  // Fetch Journeys List (Buses, distinct trips, schedules)
  const fetchJourneys = async (queryDate = selectedTravelDate) => {
    try {
      setLoadingJourneys(true);
      setError('');
      const params = {};
      if (queryDate) params.travelDate = queryDate;
      if (selectedBusId) params.vehicleId = selectedBusId;
      if (searchTerm) params.search = searchTerm;

      const res = await adminService.getBusManifestJourneys(params);
      if (res && res.success) {
        setJourneys(res.data || []);
        if (res.buses) setBuses(res.buses);

        // Auto-select first journey if none currently selected or if previously selected is no longer in list
        if (res.data && res.data.length > 0) {
          const currentExists = res.data.some(j => j.journeyKey === selectedJourneyKey);
          if (!selectedJourneyKey || !currentExists) {
            const first = res.data[0];
            setSelectedJourneyKey(first.journeyKey);
            loadManifestForJourney(first);
          }
        } else {
          setSelectedJourneyKey('');
          setManifestData([]);
          setJourneyInfo(null);
          setManifestSummary(null);
        }
      } else {
        setError(res?.message || 'Failed to load bus journeys.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error fetching journeys.');
    } finally {
      setLoadingJourneys(false);
    }
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
        status: filterStatus !== 'All' ? filterStatus : undefined,
        search: passengerSearch.trim() || undefined,
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

  // When filters (status, boarding point, passenger search) change, re-fetch active journey manifest
  useEffect(() => {
    if (selectedJourneyKey) {
      const activeJourney = journeys.find(j => j.journeyKey === selectedJourneyKey);
      if (activeJourney) {
        loadManifestForJourney(activeJourney);
      }
    }
  }, [filterStatus, filterBoardingPoint, passengerSearch]);

  const activeJourney = journeys.find(j => j.journeyKey === selectedJourneyKey) || null;

  return (
    <div className="manifest-page-wrapper">
      {/* 1. Page Header & Refresh Action */}
      <div className="manifest-header">
        <div className="manifest-title-area">
          <h1 className="manifest-title">
            <Bus size={24} style={{ color: 'var(--primary-blue)' }} />
            Bus Passenger Manifest
          </h1>
          <p className="manifest-subtitle">
            Search and select bus trips to inspect verified passenger manifests, allocated seats, boarding points, and booking statuses.
          </p>
        </div>
        <div>
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

      {/* 2. Top Filter Controls: Search & Select Journey / Bus */}
      <div className="manifest-filter-card">
        <div className="manifest-filter-grid">
          {/* Search by Registration / Driver / Operator / Route */}
          <div className="manifest-filter-field">
            <label className="manifest-filter-label">Search Bus / Route / Driver</label>
            <div style={{ position: 'relative' }}>
              <Search
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
                style={{ paddingLeft: '38px', minHeight: '42px' }}
                placeholder="Reg no, operator, driver, city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJourneys()}
              />
            </div>
          </div>

          {/* Specific Bus Dropdown */}
          <div className="manifest-filter-field">
            <label className="manifest-filter-label">Filter by Bus Registration</label>
            <select
              className="select-field"
              style={{ minHeight: '42px' }}
              value={selectedBusId}
              onChange={e => setSelectedBusId(e.target.value)}
            >
              <option value="">All Registered Buses ({buses.length})</option>
              {buses.map(b => (
                <option key={b._id} value={b._id}>
                  {b.vehicleNumber} — {b.vehicleName}
                </option>
              ))}
            </select>
          </div>

          {/* Journey Date Filter */}
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
                onChange={e => setSelectedTravelDate(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="manifest-filter-actions">
            <button
              className="btn btn-primary"
              onClick={() => fetchJourneys()}
              disabled={loadingJourneys}
            >
              Apply Filter
            </button>
            {(selectedBusId || selectedTravelDate || searchTerm) && (
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSelectedBusId('');
                  setSelectedTravelDate('');
                  setSearchTerm('');
                  fetchJourneys('');
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Journeys & Active Manifest */}
      <div className="manifest-workspace-grid">
        
        {/* Left Column: Bus & Journey Selection List */}
        <div className="manifest-journey-card">
          <div className="manifest-journey-header">
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)' }}>
                Bus Journeys & Trips
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {journeys.length} trip{journeys.length === 1 ? '' : 's'} available
              </div>
            </div>
          </div>

          {loadingJourneys ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <RotateCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--primary-blue)' }} />
              Loading journeys...
            </div>
          ) : journeys.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Bus size={36} style={{ color: 'var(--text-light)', margin: '0 auto 10px', display: 'block' }} />
              No bus journeys match the selected criteria.
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
                      <span style={{ fontWeight: '800', fontSize: '0.9rem', color: isSelected ? 'var(--primary-blue)' : 'var(--text-main)', letterSpacing: '-0.01em' }}>
                        {j.vehicleNumber}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {j.travelDate || 'Any Date'}
                      </span>
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
                  </div>
                </div>

                <div className="manifest-operator-box">
                  <div className="manifest-operator-item">
                    <span className="manifest-op-label">Operator:</span>
                    <span className="manifest-op-value">{activeJourney.operatorName || 'N/A'}</span>
                  </div>
                  <div className="manifest-operator-item">
                    <span className="manifest-op-label">Assigned Driver:</span>
                    <span className="manifest-op-value">
                      {activeJourney.driverName || 'Not Assigned'}{' '}
                      {activeJourney.driverPhone ? `(${activeJourney.driverPhone})` : ''}
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
                <div className="manifest-subfilter-search-wrap">
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
                    placeholder="Search passenger, seat, booking ID..."
                    value={passengerSearch}
                    onChange={e => setPassengerSearch(e.target.value)}
                  />
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
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {/* Boarding Point filter */}
                {activeJourney.boardingPoints && activeJourney.boardingPoints.length > 0 && (
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
              </div>

              {/* Compact Manifest Stats */}
              {manifestSummary && (
                <div className="manifest-summary-badges">
                  <span className="manifest-stat-pill total">
                    Total: {manifestSummary.totalManifestPassengers}
                  </span>
                  <span className="manifest-stat-pill confirmed">
                    Confirmed: {manifestSummary.confirmedCount}
                  </span>
                  <span className="manifest-stat-pill pending">
                    Pending: {manifestSummary.pendingCount}
                  </span>
                  <span className="manifest-stat-pill cancelled">
                    Cancelled: {manifestSummary.cancelledCount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. Manifest Passenger Table */}
          <div className="manifest-table-card">
            {loadingManifest ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RotateCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--primary-blue)' }} />
                Loading manifest passengers...
              </div>
            ) : !activeJourney ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bus size={36} style={{ color: 'var(--text-light)', margin: '0 auto 12px', display: 'block' }} />
                Please select a bus journey from the list on the left to view its passenger manifest.
              </div>
            ) : manifestData.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={36} style={{ color: 'var(--text-light)', margin: '0 auto 12px', display: 'block' }} />
                No passengers found matching the selected filters for this trip.
              </div>
            ) : (
              <div className="manifest-table-container">
                <table className="manifest-table">
                  <thead>
                    <tr>
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
                    </tr>
                  </thead>
                  <tbody>
                    {manifestData.map(row => (
                      <tr key={row.manifestId}>
                        <td>
                          <span className="seat-pill">
                            {row.seatNumber}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Passenger & Booking Details Modal */}
      {selectedBookingModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={19} style={{ color: 'var(--primary-blue)' }} />
                  Passenger & Booking Information
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Booking Ref: {selectedBookingModal.bookingId}
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
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Allocated Seat</span>
                    <strong style={{ color: 'var(--primary-blue)' }}>{selectedBookingModal.seatNumber}</strong>
                  </div>
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

              {/* Journey & Boarding */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Journey & Boarding
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Boarding Point</span>
                    <strong>{selectedBookingModal.boardingPoint}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem' }}>Destination</span>
                    <strong>{selectedBookingModal.destination}</strong>
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

              {/* Booking & Financial Status */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '750', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Booking & Payment Status
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.73rem', marginBottom: '3px' }}>Booking Status</span>
                    <StatusBadge status={selectedBookingModal.bookingStatus} />
                  </div>
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
