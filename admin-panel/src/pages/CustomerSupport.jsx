import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Check } from 'lucide-react';

const CustomerSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [status, setStatus] = useState('Open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [message, setMessage] = useState('');
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await adminService.deleteSupportTicket(deleteTarget._id);
      if (res && res.success) {
        setMessage('Support ticket deleted successfully.');
        setDeleteTarget(null);
        await fetchTickets();
        setTimeout(() => setMessage(''), 4000);
      } else {
        alert(res?.message || 'Unable to delete support ticket.');
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        alert('Ticket no longer exists. Support list refreshed.');
        setDeleteTarget(null);
        await fetchTickets();
      } else {
        alert(err?.response?.data?.message || err.message || 'Unable to delete support ticket.');
      }
    } finally {
      setDeleting(false);
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
          <table className="data-table support-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Requester</th>
                <th>Phone</th>
                <th>User Type</th>
                <th>Booking ID</th>
                <th>Category / Subject</th>
                <th>Status</th>
                <th>Admin Reply</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? (
                tickets.map(t => (
                  <tr key={t._id}>
                    <td data-label="Ticket ID" style={{ fontWeight: '700', color: '#1d4ed8' }}>{t.ticketId}</td>
                    <td data-label="Requester">
                      <div style={{ fontWeight: '600' }}>{t.requesterName}</div>
                    </td>
                    <td data-label="Phone">{t.mobileNumber || 'N/A'}</td>
                    <td data-label="User Type">
                      <span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>
                        {t.role || 'Unknown'}
                      </span>
                    </td>
                    <td data-label="Booking ID">
                      <span style={{ fontWeight: '600' }}>{t.bookingId || 'N/A'}</span>
                    </td>
                    <td data-label="Category / Subject" className="support-summary-cell">
                      <div className="support-category">{t.category || 'General'}</div>
                      <div className="support-subject">{t.supportInformation || 'Support request'}</div>
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={t.status} />
                    </td>
                    <td data-label="Admin Reply" className="support-reply-cell">
                      {t.resolutionNotes || 'Not replied'}
                    </td>
                    <td className="support-actions-cell" style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn btn-primary btn-sm support-action-button" onClick={() => handleOpenEdit(t)}>
                        View / Reply
                      </button>
                      <button type="button" className="btn btn-sm support-action-button" style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }} onClick={() => setDeleteTarget(t)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
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
              <div className="modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
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
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{selectedTicket.supportInformation || 'General support request'}</div>
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
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.9rem', color: '#334155', border: '1px solid #e2e8f0', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                  {selectedTicket.supportIssue}
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content" style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.25rem', marginBottom: '8px' }}>Delete Support Ticket?</h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '16px', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete this support ticket?
            </p>
            <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', marginBottom: '24px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Ticket:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{deleteTarget.ticketId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Requester:</span>
                <span style={{ fontWeight: '600', color: '#0f172a', wordBreak: 'break-all' }}>{deleteTarget.requesterName}</span>
              </div>
            </div>
            <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: '500', marginBottom: '24px' }}>
              This action cannot be undone.
            </p>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }} 
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSupport;
