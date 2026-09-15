import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { CalendarCheck, Search, Filter, Eye, Check, AlertCircle } from 'lucide-react';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
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
    return (
      b.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.dropLocation?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Unified Booking Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Omnichannel booking logs across Intercity Buses, EV-Sewa electric shuttles, and Cars.
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
              placeholder="Search by Booking ID, customer, pickup/drop..."
              className="form-control"
              style={{ border: 'none', backgroundColor: '#f8fafc' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
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
                <th>Service</th>
                <th>Customer</th>
                <th>Vehicle & Driver</th>
                <th>Pickup & Drop</th>
                <th>Fare</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{b.bookingId}</td>
                    <td>
                      <span className="badge badge-pending">{b.serviceType}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{b.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customer?.phone}</div>
                    </td>
                    <td>
                      <div>{b.vehicle?.vehicleName || 'Vehicle'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {b.vehicle?.vehicleNumber} • Driver: {b.driver?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '220px' }}>
                      <div>{b.pickupLocation}</div>
                      <div style={{ color: '#64748b' }}>↓ {b.dropLocation}</div>
                    </td>
                    <td style={{ fontWeight: '700' }}>₹{b.fare}</td>
                    <td>
                      <StatusBadge status={b.paymentStatus} />
                    </td>
                    <td>
                      <StatusBadge status={b.bookingStatus} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="btn btn-sm btn-outline"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {b.bookingStatus === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(b._id, 'Confirmed')}
                            className="btn btn-sm btn-success"
                          >
                            Confirm
                          </button>
                        )}
                        {b.bookingStatus === 'Confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(b._id, 'Completed')}
                            className="btn btn-sm btn-primary"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No bookings found matching filters.
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
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Booking Details: {selectedBooking.bookingId}</h3>
                <span className="badge badge-pending">{selectedBooking.serviceType}</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedBooking(null)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Customer Information</span>
                <div style={{ fontWeight: '700' }}>
                  {selectedBooking.customer?.name} ({selectedBooking.customer?.phone})
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Assigned Vehicle & Driver</span>
                <div style={{ fontWeight: '700' }}>
                  {selectedBooking.vehicle?.vehicleName} ({selectedBooking.vehicle?.vehicleNumber})
                </div>
                <div style={{ color: '#475569' }}>Driver: {selectedBooking.driver?.name || 'Unassigned'}</div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', gridColumn: 'span 2' }}>
                <span style={{ color: '#64748b' }}>Passenger Roster</span>
                <div style={{ marginTop: '4px' }}>
                  {selectedBooking.passengerDetails && selectedBooking.passengerDetails.length > 0
                    ? selectedBooking.passengerDetails.map((p, idx) => (
                        <div key={idx} style={{ fontWeight: '600' }}>
                          • {p.name}, Age: {p.age}, Gender: {p.gender} {p.seatNumber ? `(Seat: ${p.seatNumber})` : ''}
                        </div>
                      ))
                    : '1 Passenger'}
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', gridColumn: 'span 2' }}>
                <span style={{ color: '#64748b' }}>Route Details</span>
                <div style={{ fontWeight: '600' }}>Pickup: {selectedBooking.pickupLocation}</div>
                <div style={{ fontWeight: '600' }}>Drop: {selectedBooking.dropLocation}</div>
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
