import React from 'react';
import { LogOut } from 'lucide-react';

const AdminLogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}
          >
            <LogOut size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Sign Out Super Admin</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>End your platform administration session?</p>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '24px', lineHeight: '1.5' }}>
          You will need to enter your super admin credentials again to modify fleet configurations and approve document verifications.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Logout Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogoutModal;
