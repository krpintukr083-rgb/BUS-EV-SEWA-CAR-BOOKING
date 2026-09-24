import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
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
                      <button type="button" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={() => handleOpenEdit(t)}>
                        View / Reply
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
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="card-header-flex">
              <h3 className="card-title">Support Ticket #{selectedTicket.ticketId}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTicket}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Ticket ID</label>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1d4ed8' }}>{selectedTicket.ticketId}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Requester Name</label>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{selectedTicket.requesterName}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Phone Number</label>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{selectedTicket.mobileNumber}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>User Type</label>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', textTransform: 'capitalize' }}>{selectedTicket.role}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Booking Reference</label>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{selectedTicket.bookingId || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Category</label>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{selectedTicket.category || 'General'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Subject / Info</label>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{selectedTicket.supportInformation}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Created Date</label>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                    {new Date(selectedTicket.createdAt).toLocaleDateString()} {new Date(selectedTicket.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>Original Message</label>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.9rem', color: '#334155', border: '1px solid #e2e8f0' }}>
                  {selectedTicket.supportIssue}
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: '700' }}>Current Status</label>
                <select className="form-control" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>Admin Reply</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Type your response..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
                  Send Reply
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
