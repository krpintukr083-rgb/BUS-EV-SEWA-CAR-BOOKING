import React, { useState, useEffect } from 'react';
import { driverService } from '../services/driverService';
import StatusBadge from '../components/StatusBadge';
import { History, Calendar, MapPin, Search } from 'lucide-react';

const BookingHistory = () => {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await driverService.getBookingHistory();
        if (res.success) {
          setHistory(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading booking history...</div>;
  }

  const filteredHistory = history.filter(b => {
    const matchSearch =
      b.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.dropLocation?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchService = filterService === 'All' || b.serviceType === filterService;
    return matchSearch && matchService;
  });

  return (
    <div>
      {/* Header and Filter Controls */}
      <div className="content-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by Booking ID, Customer, or Location..."
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
              <option value="Bus">Bus Booking</option>
              <option value="EV-Sewa">EV-Sewa</option>
              <option value="Car">Car Booking</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Data Table */}
      <div className="content-card">
        <div className="card-header-flex">
          <h3 className="card-title">Completed & Past Trips ({filteredHistory.length})</h3>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Service Type</th>
                <th>Vehicle</th>
                <th>Route (Pickup & Drop)</th>
                <th>Fare</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{b.bookingId}</td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(b.travelDate || b.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{b.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customer?.phone}</div>
                    </td>
                    <td>
                      <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                        {b.serviceType}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {b.vehicle ? `${b.vehicle.vehicleNumber}` : 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '240px' }}>
                      <div><strong>From:</strong> {b.pickupLocation}</div>
                      <div><strong>To:</strong> {b.dropLocation}</div>
                    </td>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>₹{b.fare}</td>
                    <td>
                      <StatusBadge status={b.paymentStatus} />
                    </td>
                    <td>
                      <StatusBadge status={b.bookingStatus} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No matching trip history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BookingHistory;
