import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { CalendarCheck, Search, Filter, Eye, Check, AlertCircle, Truck, Building, ShoppingBag, DollarSign } from 'lucide-react';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [message, setMessage] = useState('');

  const fetchBookings = async () => {
    try {
      const res = await adminService.getBookings(
        filterService !== 'All' ? filterService : undefined,
        filterStatus !== 'All' ? filterStatus : undefined
      );
      if (res.success) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterService, filterStatus]);

  const handleUpdateStatus = async (id, bookingStatus) => {
    setMessage('');
    try {
      const res = await adminService.updateBookingStatus(id, bookingStatus);
      if (res.success) {
        setMessage(`Booking status updated to ${bookingStatus}`);
        await fetchBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading booking records...</div>;
  }

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.dropLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vehicle?.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource =
      filterSource === 'All' ||
      (filterSource === 'THIRD_PARTY' && (b.vehicleSource === 'THIRD_PARTY' || b.vehicle?.vehicleSource === 'THIRD_PARTY')) ||
      (filterSource === 'OWN' && (b.vehicleSource !== 'THIRD_PARTY' && b.vehicle?.vehicleSource !== 'THIRD_PARTY'));

    return matchesSearch && matchesSource;
  });

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Unified Booking & Trip Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Omnichannel booking logs across Own Fleet and Third-Party / Market-Hired Vehicles (Buses, EV-Sewa, Cars).
          </p>
        </div>
        <div style={{ fontWeight: '700', color: '#1d4ed8' }}>Total Bookings: {bookings.length}</div>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#059669',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="content-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by Booking ID, customer, vehicle no, pickup/drop..."
              className="form-control"
              style={{ border: 'none', backgroundColor: '#f8fafc' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Source:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
            >
              <option value="All">All Sources</option>
              <option value="OWN">Own Fleet Trips</option>
              <option value="THIRD_PARTY">Third-Party / Market Hired</option>
            </select>

            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Service:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
            >
              <option value="All">All Services</option>
              <option value="Bus">Bus</option>
              <option value="EV-Sewa">EV-Sewa</option>
              <option value="Car">Car</option>
            </select>

            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Status:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending Driver Confirmation">Pending Driver Confirmation</option>
              <option value="Awaiting Cash Collection">Awaiting Cash Collection</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Service & Source</th>
                <th>Customer</th>
                <th>Vehicle & Driver</th>
                <th>Pickup & Drop</th>
                <th>Fare</th>
                <th>Payment</th>
                <th>Driver Confirmation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map(b => {
                  const isThirdParty = b.vehicleSource === 'THIRD_PARTY' || b.vehicle?.vehicleSource === 'THIRD_PARTY';

                  return (
                    <tr key={b._id}>
                      <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{b.bookingId}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className="badge badge-pending" style={{ width: 'fit-content' }}>{b.serviceType}</span>
                          {isThirdParty ? (
                            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#c2410c', backgroundColor: '#ffedd5', padding: '1px 5px', borderRadius: '3px', width: 'fit-content' }}>
                              MARKET HIRED
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#1e40af', backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px', width: 'fit-content' }}>
                              OWN FLEET
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{b.customer?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customer?.phone}</div>
                      </td>
                      <td>
                        <div>{b.vehicle?.vehicleName || 'Vehicle'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          <strong style={{ color: isThirdParty ? '#ea580c' : '#1d4ed8' }}>{b.vehicle?.vehicleNumber}</strong> • Driver: {b.driver?.name || b.hiredVehicleDetails?.driverName || 'Unassigned'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '220px' }}>
                        <div>{b.pickupLocation}</div>
                        <div style={{ color: '#64748b' }}>↓ {b.dropLocation}</div>
                      </td>
                      <td style={{ fontWeight: '700' }}>₹{b.fare}</td>
                      <td>
                        <StatusBadge status={b.paymentStatus} />
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                          {b.paymentMethod || 'Online'}
                        </div>
                        {b.paymentMethod === 'Offline Cash' && (
                          b.cashCollected ? (
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700' }}>
                              ✓ Cash Collected
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '600' }}>
                              ⏳ Pending Cash
                            </div>
                          )
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor:
                              b.driverConfirmationStatus === 'Confirmed'
                                ? '#dcfce7'
                                : b.driverConfirmationStatus === 'Rejected'
                                ? '#fee2e2'
                                : '#fef3c7',
                            color:
                              b.driverConfirmationStatus === 'Confirmed'
                                ? '#15803d'
                                : b.driverConfirmationStatus === 'Rejected'
                                ? '#b91c1c'
                                : '#b45309'
                          }}
                        >
                          {b.driverConfirmationStatus || (b.bookingStatus === 'Confirmed' ? 'Confirmed' : 'Pending')}
                        </span>
                        {b.driverConfirmedAt && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            {new Date(b.driverConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={b.bookingStatus} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setSelectedBooking(b)}
                          >
                            <Eye size={14} /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Booking Details</h3>
                <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700' }}>
                  {selectedBooking.bookingId}
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedBooking(null)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.875rem', marginTop: '16px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Customer</span>
                <div style={{ fontWeight: '700' }}>{selectedBooking.customer?.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedBooking.customer?.phone}</div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Service & Vehicle Source</span>
                <div style={{ fontWeight: '700' }}>
                  {selectedBooking.serviceType} ({(selectedBooking.vehicleSource || selectedBooking.vehicle?.vehicleSource) === 'THIRD_PARTY' ? 'Third-Party Market Hired' : 'Own Fleet'})
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Vehicle Information</span>
                <div style={{ fontWeight: '700' }}>{selectedBooking.vehicle?.vehicleName || 'Vehicle'}</div>
                <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: '600' }}>
                  {selectedBooking.vehicle?.vehicleNumber}
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Assigned Driver</span>
                <div style={{ fontWeight: '700' }}>
                  {selectedBooking.driver?.name || selectedBooking.hiredVehicleDetails?.driverName || 'Unassigned'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedBooking.driver?.mobileNumber || selectedBooking.hiredVehicleDetails?.driverMobile || 'N/A'}
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Pickup Point</span>
                <div style={{ fontWeight: '600' }}>{selectedBooking.pickupLocation}</div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Drop Point</span>
                <div style={{ fontWeight: '600' }}>{selectedBooking.dropLocation}</div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Customer Fare</span>
                <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#0f172a' }}>
                  ₹{selectedBooking.fare}
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Payment Details</span>
                <div><StatusBadge status={selectedBooking.paymentStatus} /></div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Method: {selectedBooking.paymentMethod}
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Driver Confirmation</span>
                <div style={{ fontWeight: '700', color: selectedBooking.driverConfirmationStatus === 'Confirmed' ? '#15803d' : selectedBooking.driverConfirmationStatus === 'Rejected' ? '#b91c1c' : '#b45309' }}>
                  {selectedBooking.driverConfirmationStatus || 'Pending'}
                </div>
                {selectedBooking.driverConfirmedAt && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Confirmed: {new Date(selectedBooking.driverConfirmedAt).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>

            {/* Third-Party Market Hired Vehicle Snapshot */}
            {(selectedBooking.vehicleSource === 'THIRD_PARTY' || selectedBooking.vehicle?.vehicleSource === 'THIRD_PARTY' || selectedBooking.hiredVehicleDetails) && (
              <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#c2410c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={15} /> Market Hired Vehicle Financials & Vendor Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div><strong>Vendor Name:</strong> {selectedBooking.hiredVehicleDetails?.vendorName || selectedBooking.vehicle?.vendorDetails?.vendorName || selectedBooking.vehicle?.ownerName || 'Market Vendor'}</div>
                  <div><strong>Vendor Mobile:</strong> {selectedBooking.hiredVehicleDetails?.vendorMobile || selectedBooking.vehicle?.vendorDetails?.vendorMobile || selectedBooking.vehicle?.ownerMobileNumber || 'N/A'}</div>
                  <div><strong>Market Hire Cost:</strong> <span style={{ fontWeight: '700', color: '#ea580c' }}>₹{selectedBooking.hiredVehicleDetails?.hireAmount || selectedBooking.vehicle?.hireDetails?.hireAmount || 0}</span></div>
                  <div><strong>Vendor Payment Status:</strong> <span style={{ fontWeight: '700' }}>{selectedBooking.hiredVehicleDetails?.hirePaymentStatus || selectedBooking.vehicle?.hireDetails?.paymentStatus || 'Pending'}</span></div>
                  {selectedBooking.hiredVehicleDetails?.driverName && (
                    <div><strong>Hired Driver:</strong> {selectedBooking.hiredVehicleDetails.driverName} ({selectedBooking.hiredVehicleDetails.driverMobile})</div>
                  )}
                  {selectedBooking.hiredVehicleDetails?.notes && (
                    <div style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {selectedBooking.hiredVehicleDetails.notes}</div>
                  )}
                </div>
              </div>
            )}

            {/* Status Modification Controls */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px' }}>
                Update Booking Status:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Pending', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'].map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      handleUpdateStatus(selectedBooking._id, st);
                      setSelectedBooking(null);
                    }}
                    className={`btn btn-sm ${selectedBooking.bookingStatus === st ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setSelectedBooking(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
