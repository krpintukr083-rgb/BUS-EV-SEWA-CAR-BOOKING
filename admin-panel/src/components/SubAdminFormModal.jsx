import React, { useState } from 'react';
import { adminService } from '../services/adminService';

const PERMISSION_GROUPS = [
  { name: 'Driver', prefix: 'driver.' },
  { name: 'Customer', prefix: 'customer.' },
  { name: 'Vehicle', prefix: 'vehicle.' },
  { name: 'Booking', prefix: 'booking.' },
  { name: 'Payment', prefix: 'payment.' },
  { name: 'Withdrawal', prefix: 'withdrawal.' },
  { name: 'Cancellation', prefix: 'cancellation.' },
  { name: 'Notification', prefix: 'notification.' },
  { name: 'Support', prefix: 'support.' },
  { name: 'Reports', prefix: 'report.' },
  { name: 'Admin', prefix: 'admin.' }
];

/**
 * SubAdminFormModal – Handles both create and edit of a Sub‑Admin.
 * Props:
 *   onClose: () => void – closes the modal
 *   editingSubAdmin: object | null – if provided, modal works in edit mode
 *   permissionTemplates: object – { templates: {...}, allPermissions: [...] }
 *   allPermissions: array – flat list of all permission strings (fallback)
 */
const SubAdminFormModal = ({ onClose, editingSubAdmin, permissionTemplates, allPermissions }) => {
  const isEdit = !!editingSubAdmin;
  const [name, setName] = useState(editingSubAdmin?.name || '');
  const [email, setEmail] = useState(editingSubAdmin?.email || '');
  const [phone, setPhone] = useState(editingSubAdmin?.phone || '');
  const [password, setPassword] = useState('');
  const [adminType, setAdminType] = useState(editingSubAdmin?.adminType || 'custom');
  const [selectedPermissions, setSelectedPermissions] = useState(editingSubAdmin?.permissions || []);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        email,
        phone,
        password: password || undefined,
        adminType,
        permissions: adminType === 'custom' ? selectedPermissions : undefined
      };
      if (isEdit) {
        await adminService.updateSubAdmin(editingSubAdmin._id, payload);
      } else {
        await adminService.createSubAdmin(payload);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (perm) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const renderPermissionList = () => {
    const permissions = adminType === 'custom' ? (allPermissions || []) : [];
    const groupedPermissions = PERMISSION_GROUPS.map(group => ({
      ...group,
      permissions: permissions.filter(permission => permission.startsWith(group.prefix))
    })).filter(group => group.permissions.length > 0);
    const groupedValues = new Set(groupedPermissions.flatMap(group => group.permissions));
    const otherPermissions = permissions.filter(permission => !groupedValues.has(permission));
    const groups = otherPermissions.length
      ? [...groupedPermissions, { name: 'Other', permissions: otherPermissions }]
      : groupedPermissions;

    return (
      <div className="subadmin-permission-grid">
        {groups.map(group => (
          <section className="subadmin-permission-group" key={group.name}>
            <h3 className="subadmin-permission-group-title">{group.name}</h3>
            <div className="subadmin-permission-options">
              {group.permissions.map((perm) => (
                <label key={perm} className="subadmin-permission-option">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  <span>{perm}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="subadmin-modal-overlay" role="presentation">
      <div className="subadmin-modal content-card" role="dialog" aria-modal="true" aria-labelledby="subadmin-form-title">
        <div className="card-header-flex subadmin-modal-header">
          <div>
            <p className="subadmin-eyebrow">Access control</p>
            <h2 id="subadmin-form-title" className="card-title subadmin-modal-title">
              {isEdit ? 'Edit Sub-Admin' : 'Create Sub-Admin'}
            </h2>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="subadmin-form-grid">
            <div className="subadmin-field">
              <label htmlFor="subadmin-name">Full Name</label>
              <input
                id="subadmin-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-control"
              />
            </div>
            <div className="subadmin-field">
              <label htmlFor="subadmin-email">Email</label>
              <input
                id="subadmin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-control"
              />
            </div>
            <div className="subadmin-field">
              <label htmlFor="subadmin-phone">Mobile Number</label>
              <input
                id="subadmin-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-control"
              />
            </div>
            {!isEdit && (
              <div className="subadmin-field">
                <label htmlFor="subadmin-password">Password</label>
                <input
                  id="subadmin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
            )}
            <div className="subadmin-field">
              <label htmlFor="subadmin-role-type">Role Type</label>
              <select
                id="subadmin-role-type"
                value={adminType}
                onChange={(e) => setAdminType(e.target.value)}
                className="form-control"
              >
                {permissionTemplates?.templates && Object.keys(permissionTemplates.templates).map((key) => (
                  <option key={key} value={key}>{key.replace('_', ' ')}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          {adminType === 'custom' && (
            <div className="subadmin-permissions">
              <div className="subadmin-permissions-heading">
                <div>
                  <h3>Select Permissions</h3>
                  <p>Choose the access this admin should have.</p>
                </div>
                <span className="subadmin-count-badge">{selectedPermissions.length} selected</span>
              </div>
              {renderPermissionList()}
            </div>
          )}
          <div className="subadmin-form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubAdminFormModal;
