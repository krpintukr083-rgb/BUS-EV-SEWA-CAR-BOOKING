import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { Headphones, Check, Edit, AlertCircle } from 'lucide-react';

const CustomerSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [status, setStatus] = useState('Open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [message, setMessage] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await adminService.getSupportTickets();
      if (res.success) {
        setTickets(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenEdit = ticket => {
    setSelectedTicket(ticket);
    setStatus(ticket.status);
    setResolutionNotes(ticket.resolutionNotes || '');
    setIsEditOpen(true);
  };

  const handleSaveTicket = async e => {
    e.preventDefault();
    try {
      const res = await adminService.updateSupportTicket(selectedTicket._id, {
        status,
        resolutionNotes
      });
      if (res.success) {
        setMessage('Support ticket updated successfully!');
        setIsEditOpen(false);
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading customer support tickets...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Customer & Driver Support Center</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Official inquiry logs, trip grievance handling, and support status resolution desk.
          </p>
        </div>
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

      {/* Tickets Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Requester</th>
                <th>Role</th>
                <th>Booking Ref</th>
                <th>Support Grievance / Issue</th>
                <th>Status</th>
                <th>Resolution Details</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? (
                tickets.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{t.ticketId}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{t.requesterName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.mobileNumber}</div>
                    </td>
                    <td>
                      <span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>
                        {t.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600' }}>{t.bookingId || 'N/A'}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#334155', maxWidth: '280px' }}>{t.supportIssue}</td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '200px' }}>
                      {t.resolutionNotes || t.supportInformation}
                    </td>
                    <td>
                      <button onClick={() => handleOpenEdit(t)} className="btn btn-sm btn-outline">
                        <Edit size={13} /> Update
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No support tickets logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Ticket Modal */}
      {isEditOpen && selectedTicket && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header-flex">
              <h3 className="card-title">Update Ticket: {selectedTicket.ticketId}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTicket}>
              <div className="form-group">
                <label className="form-label">Issue Summary</label>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {selectedTicket.supportIssue}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Support Status</label>
                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Official Resolution Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Record support actions taken..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSupport;
