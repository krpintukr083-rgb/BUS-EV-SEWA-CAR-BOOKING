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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Controls */}
      <div className="card-header-flex">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bus size={22} style={{ color: 'var(--primary-blue)' }} />
            Bus Passenger Manifest
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Search and select bus trips to view verified real-time passenger manifests, allocated seats, boarding points, and booking statuses.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => fetchJourneys()}
          disabled={loadingJourneys || loadingManifest}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCw size={15} className={loadingJourneys || loadingManifest ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: 'var(--status-blocked-bg)',
            border: '1px solid #fecaca',
            color: 'var(--status-blocked)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem'
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top Filter Controls: Search & Select Journey / Bus */}
      <div className="content-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          {/* Search by Registration / Driver / Operator / Route */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              SEARCH BUS / ROUTE / DRIVER
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '36px' }}
                placeholder="Reg no, operator, driver, city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJourneys()}
              />
            </div>
          </div>

          {/* Specific Bus Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              FILTER BY BUS REGISTRATION
            </label>
            <select
              className="select-field"
              value={selectedBusId}
              onChange={e => {
                setSelectedBusId(e.target.value);
              }}
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
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              JOURNEY DATE
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="date"
                className="input-field"
                style={{ paddingLeft: '36px' }}
                value={selectedTravelDate}
                onChange={e => {
                  setSelectedTravelDate(e.target.value);
                }}
              />
            </div>
          </div>

          {/* Apply Filter Button */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Column: Bus & Journey Selection List */}
        <div className="content-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                Bus Journeys & Trips
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {journeys.length} trip{journeys.length === 1 ? '' : 's'} available
              </div>
            </div>
          </div>

          {loadingJourneys ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Loading journeys...
            </div>
          ) : journeys.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Bus size={32} style={{ color: 'var(--text-light)', margin: '0 auto 8px', display: 'block' }} />
              No bus journeys match the selected criteria.
            </div>
          ) : (
            <div style={{ maxHeight: '720px', overflowY: 'auto' }}>
              {journeys.map(j => {
                const isSelected = j.journeyKey === selectedJourneyKey;
                return (
                  <div
                    key={j.journeyKey}
                    onClick={() => handleSelectJourney(j)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--primary-blue-light)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--primary-blue)' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? 'var(--primary-blue)' : 'var(--text-main)' }}>
                        {j.vehicleNumber}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                        {j.travelDate || 'Any Date'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '4px', fontWeight: '500' }}>
                      {j.origin} → {j.destination}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={12} /> {j.departureTime}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Users size={12} /> {j.totalPassengers} Pax ({j.totalBookings} Bkg)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-light)' }}>
                      <span>Driver: {j.driverName}</span>
                      <ChevronRight size={14} style={{ color: isSelected ? 'var(--primary-blue)' : 'var(--text-light)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Journey Passenger Manifest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Selected Journey Header Info */}
          {activeJourney && (
            <div className="content-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--primary-blue)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                      {activeJourney.vehicleNumber}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ({activeJourney.vehicleName})
                    </span>
                    <StatusBadge status={activeJourney.status} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} style={{ color: 'var(--primary-blue)' }} />
                      <strong>Route:</strong> {activeJourney.origin} → {activeJourney.destination}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} style={{ color: 'var(--primary-blue)' }} />
                      <strong>Date:</strong> {activeJourney.travelDate || 'All Dates'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} style={{ color: 'var(--primary-blue)' }} />
                      <strong>Departure:</strong> {activeJourney.departureTime}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  <div><strong>Operator:</strong> {activeJourney.operatorName}</div>
                  <div><strong>Assigned Driver:</strong> {activeJourney.driverName} {activeJourney.driverPhone ? `(${activeJourney.driverPhone})` : ''}</div>
                  <div><strong>Capacity:</strong> {activeJourney.seatingCapacity} seats</div>
                </div>
              </div>
            </div>
          )}

          {/* Manifest Filter Toolbar & Summary */}
          {activeJourney && (
            <div className="content-card" style={{ padding: '12px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                
                {/* Search within manifest */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 240px' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: '32px', fontSize: '0.8rem', height: '36px' }}
                      placeholder="Search passenger, seat, booking ID..."
                      value={passengerSearch}
                      onChange={e => setPassengerSearch(e.target.value)}
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    className="select-field"
                    style={{ fontSize: '0.8rem', height: '36px', width: 'auto' }}
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
                      className="select-field"
                      style={{ fontSize: '0.8rem', height: '36px', width: 'auto' }}
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
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.775rem', fontWeight: '600' }}>
                    <span style={{ color: 'var(--text-main)' }}>Total: {manifestSummary.totalManifestPassengers}</span>
                    <span style={{ color: 'var(--status-active)' }}>Confirmed: {manifestSummary.confirmedCount}</span>
                    <span style={{ color: 'var(--status-pending)' }}>Pending: {manifestSummary.pendingCount}</span>
                    <span style={{ color: 'var(--status-blocked)' }}>Cancelled: {manifestSummary.cancelledCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Manifest Passenger Table */}
          <div className="content-card" style={{ padding: '0', overflow: 'hidden' }}>
            {loadingManifest ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading manifest passengers...
              </div>
            ) : !activeJourney ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Please select a bus journey from the list on the left to view its passenger manifest.
              </div>
            ) : manifestData.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ color: 'var(--text-light)', margin: '0 auto 8px', display: 'block' }} />
                No passengers found matching the selected filters for this trip.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Seat</th>
                      <th>Passenger Name</th>
                      <th>Age / Gender</th>
                      <th>Mobile Number</th>
                      <th>Booking ID</th>
                      <th>Boarding Point</th>
                      <th>Destination</th>
                      <th>Booking Status</th>
                      <th>Payment</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifestData.map(row => (
                      <tr key={row.manifestId}>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              backgroundColor: row.seatNumber !== 'N/A' && row.seatNumber !== 'Unassigned' ? 'var(--primary-blue-light)' : '#f1f5f9',
                              color: row.seatNumber !== 'N/A' && row.seatNumber !== 'Unassigned' ? 'var(--primary-blue)' : 'var(--text-muted)',
                              borderRadius: '4px',
                              fontWeight: '700',
                              fontSize: '0.8rem'
                            }}
                          >
                            {row.seatNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                            {row.passengerName}
                          </div>
                          {row.isLeadPassenger && row.passengerCountInBooking > 1 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--primary-blue)', fontWeight: '500' }}>
                              Lead Passenger ({row.passengerCountInBooking} pax total)
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {row.age !== null ? `${row.age} yrs` : 'N/A'} • {row.gender || 'N/A'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          {row.mobileNumber}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-main)' }}>
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
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setSelectedBookingModal(row)}
                            title="View Booking & Passenger Details"
                          >
                            <Eye size={13} />
                            Details
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
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} style={{ color: 'var(--primary-blue)' }} />
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
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Passenger Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Full Name</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedBookingModal.passengerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Allocated Seat</span>
                    <strong style={{ color: 'var(--primary-blue)' }}>{selectedBookingModal.seatNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Age / Gender</span>
                    <span>{selectedBookingModal.age ? `${selectedBookingModal.age} years` : 'N/A'} • {selectedBookingModal.gender || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Passenger Count</span>
                    <span>{selectedBookingModal.passengerCountInBooking} passenger(s) in booking</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Contact Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Mobile Number</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                      {selectedBookingModal.mobileNumber}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Email Address</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                      {selectedBookingModal.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Journey & Boarding */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Journey & Boarding
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Boarding Point</span>
                    <strong>{selectedBookingModal.boardingPoint}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Destination</span>
                    <strong>{selectedBookingModal.destination}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Journey Date</span>
                    <span>{selectedBookingModal.journeyDate}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Departure Time</span>
                    <span>{selectedBookingModal.departureTime}</span>
                  </div>
                </div>
              </div>

              {/* Booking & Financial Status */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Booking & Payment Status
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Booking Status</span>
                    <StatusBadge status={selectedBookingModal.bookingStatus} />
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Payment Status</span>
                    <StatusBadge status={selectedBookingModal.paymentStatus} />
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Payment Method</span>
                    <span>{selectedBookingModal.paymentMethod}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Recorded Fare</span>
                    <strong>NPR {selectedBookingModal.fare}</strong>
                  </div>
                </div>
              </div>

              {/* Emergency Contact & Special Assistance (Only if recorded in DB) */}
              <div style={{ backgroundColor: 'var(--bg-light)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Emergency & Special Assistance
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Emergency Contact</span>
                    {selectedBookingModal.emergencyContact ? (
                      <span>
                        {selectedBookingModal.emergencyContact.name} ({selectedBookingModal.emergencyContact.relationship}) - {selectedBookingModal.emergencyContact.phone}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Not collected</span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Special Assistance Notes</span>
                    {selectedBookingModal.specialAssistanceNotes ? (
                      <span>{selectedBookingModal.specialAssistanceNotes}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>None recorded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
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
