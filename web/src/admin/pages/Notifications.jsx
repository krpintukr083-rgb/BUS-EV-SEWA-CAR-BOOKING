import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { Bell, Send, Check, AlertCircle } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState('All Users');
  const [recipientRole, setRecipientRole] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await adminService.getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSend = async e => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const res = await adminService.createNotification({
        title,
        message: messageText,
        recipient,
        recipientRole
      });
      if (res.success) {
        setMessage('Notification broadcast created successfully!');
        setIsAddOpen(false);
        setTitle('');
        setMessageText('');
        await fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading notifications...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Platform Notifications</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Broadcast operational safety bulletins and system notices to drivers and passengers.
          </p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
          <Send size={16} /> Broadcast New Notice
        </button>
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

      {/* Notifications Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Notification Title</th>
                <th>Message Content</th>
                <th>Target Recipient</th>
                <th>Recipient Role</th>
                <th>Date Broadcast</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {notifications.length > 0 ? (
                notifications.map(n => (
                  <tr key={n._id}>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>{n.title}</td>
                    <td style={{ fontSize: '0.85rem', color: '#475569', maxWidth: '360px' }}>{n.message}</td>
                    <td>
                      <span className="badge badge-pending">{n.recipient}</span>
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{n.recipientRole}</td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(n.date || n.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <StatusBadge status={n.status === 'Unread' ? 'Active' : 'Completed'} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No notifications broadcast.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Modal */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header-flex">
              <h3 className="card-title">Broadcast Notification</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setIsAddOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSend}>
              <div className="form-group">
                <label className="form-label">Notification Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Monsoon Highway Advisory"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Text</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Enter notice details..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <select
                  className="form-control"
                  value={recipientRole}
                  onChange={e => {
                    setRecipientRole(e.target.value);
                    setRecipient(
                      e.target.value === 'all'
                        ? 'All Users'
                        : e.target.value === 'driver'
                        ? 'All Drivers'
                        : 'All Customers'
                    );
                  }}
                >
                  <option value="all">All Platform Users</option>
                  <option value="driver">Drivers Only</option>
                  <option value="customer">Customers Only</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Broadcast Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
