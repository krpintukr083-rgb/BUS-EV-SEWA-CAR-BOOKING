import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { adminService } from '../services/adminService';
import { useAdminAuth } from '../context/AdminAuthContext';
import SubAdminFormModal from '../components/SubAdminFormModal';

const displayText = (value, fallback = '—') => {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    if (typeof value.name === 'string') return value.name;
    if (typeof value.label === 'string') return value.label;
    if (typeof value.key === 'string') return value.key;
  }
  return fallback;
};

const getSuccessMessage = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value?.message === 'string') return value.message;
  if (typeof value?.success === 'string') return value.success;
  return 'Sub-Admin saved successfully.';
};

/**
 * Sub-Admin Management Page – accessible only to Super Admins.
 * Displays list of sub-admins with actions: view, edit, permissions, status toggle, suspend, delete.
 */
const SubAdminManagement = () => {
  const { adminUser } = useAdminAuth();
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [templates, setTemplates] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSubAdmins = async () => {
    try {
      const res = await adminService.getSubAdmins();
      if (res.success) {
        setSubAdmins(res.data);
      }
    } catch (e) {
      console.error('Failed to load sub-admins', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await adminService.getPermissionTemplates();
      if (res.success) setTemplates(res.data);
    } catch (e) {
      console.error('Failed to load permission templates', e);
    }
  };

  useEffect(() => {
    if (adminUser?.role === 'admin') {
      fetchSubAdmins();
      fetchTemplates();
    }
  }, [adminUser]);

  if (adminUser?.role !== 'admin') {
    return <div className="subadmin-access-denied">You do not have access to Sub-Admin Management.</div>;
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Sub‑Admin? This action cannot be undone.')) return;
    await adminService.deleteSubAdmin(id);
    fetchSubAdmins();
  };

  const handleStatusToggle = async (subAdmin) => {
    const newStatus = subAdmin.status === 'Active' ? 'Inactive' : 'Active';
    await adminService.updateSubAdminStatus(subAdmin._id, newStatus);
    fetchSubAdmins();
  };

  const handleSuspend = async (subAdmin) => {
    await adminService.updateSubAdminStatus(subAdmin._id, 'Suspended');
    fetchSubAdmins();
  };

  const openEdit = (subAdmin) => {
    setSuccessMessage('');
    setEditingSubAdmin(subAdmin);
    setShowForm(true);
  };

  const openCreate = () => {
    setSuccessMessage('');
    setEditingSubAdmin(null);
    setShowForm(true);
  };

  const closeForm = (message) => {
    setShowForm(false);
    if (message) setSuccessMessage(getSuccessMessage(message));
    fetchSubAdmins();
  };

  return (
    <div className="subadmin-page">
      <header className="subadmin-page-header">
        <div>
          <p className="subadmin-eyebrow">Access control</p>
          <h1>Sub-Admin Management</h1>
          <p className="subadmin-page-description">
            Manage administrator accounts, roles, and platform permissions.
          </p>
        </div>
        <button type="button" className="btn btn-primary subadmin-create-button" onClick={openCreate}>
          <UserPlus size={17} />
          <span>Create Sub-Admin</span>
        </button>
      </header>

      {successMessage && (
        <div className="subadmin-success-message" role="status">
          {successMessage}
        </div>
      )}

      <section className="content-card subadmin-table-card">
        <div className="subadmin-table-heading">
          <div>
            <h2 className="card-title">Administrator accounts</h2>
            <p>Review account access and manage administrator status.</p>
          </div>
          {!loading && <span className="subadmin-count-badge">{subAdmins.length} total</span>}
        </div>

        {loading ? (
          <div className="subadmin-loading" role="status">Loading administrators...</div>
        ) : (
          <div className="table-responsive subadmin-table-scroll">
            <table className="data-table subadmin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role Type</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subAdmins.length > 0 ? subAdmins.map((admin) => (
                  <tr key={admin._id}>
                    <td className="subadmin-name-cell">{displayText(admin.name)}</td>
                    <td>{displayText(admin.email)}</td>
                    <td><span className="subadmin-role">{displayText(admin.adminType, 'Custom')}</span></td>
                    <td><span className="subadmin-count-badge">{(admin.permissions || []).length}</span></td>
                    <td>
                      <span className={`badge badge-${String(admin.status || '').toLowerCase()} subadmin-status subadmin-status-${String(admin.status || '').toLowerCase()}`}>
                        <span className="subadmin-status-dot" />
                        {displayText(admin.status)}
                      </span>
                    </td>
                    <td>{displayText(admin.adminMeta?.createdBy?.name)}</td>
                    <td>
                      {admin.adminMeta?.lastLoginAt
                        ? new Date(admin.adminMeta.lastLoginAt).toLocaleString()
                        : <span className="subadmin-muted">Never</span>}
                    </td>
                    <td>
                      <div className="subadmin-actions">
                        <button type="button" className="subadmin-action-button subadmin-action-edit" onClick={() => openEdit(admin)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="subadmin-action-button subadmin-action-toggle"
                          onClick={() => handleStatusToggle(admin)}
                        >
                          {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        {admin.status !== 'Suspended' && (
                          <button
                            type="button"
                            className="subadmin-action-button subadmin-action-suspend"
                            onClick={() => handleSuspend(admin)}
                          >
                            Suspend
                          </button>
                        )}
                        <button type="button" className="subadmin-action-button subadmin-action-delete" onClick={() => handleDelete(admin._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="subadmin-empty-state">
                      No sub-admin accounts found. Create an account to grant delegated access.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <SubAdminFormModal
          onClose={closeForm}
          editingSubAdmin={editingSubAdmin}
          permissionTemplates={templates?.templates}
          allPermissions={templates?.allPermissions}
        />
      )}
    </div>
  );
};

export default SubAdminManagement;
