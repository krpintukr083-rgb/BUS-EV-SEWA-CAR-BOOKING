import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { useAdminAuth } from '../context/AdminAuthContext';
import SubAdminFormModal from '../components/SubAdminFormModal';

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
    return <div className="p-8 text-red-600">You do not have access to Sub‑Admin Management.</div>;
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
    setEditingSubAdmin(subAdmin);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingSubAdmin(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    fetchSubAdmins();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Sub‑Admin Management</h1>
      <button
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        onClick={openCreate}
      >
        + Create Sub‑Admin
      </button>

      {loading ? (
        <p className="mt-4">Loading…</p>
      ) : (
        <table className="mt-4 w-full table-auto border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Role Type</th>
              <th className="border p-2">Permissions</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Created By</th>
              <th className="border p-2">Last Login</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subAdmins.map((admin) => (
              <tr key={admin._id} className="hover:bg-gray-50">
                <td className="border p-2">{admin.name}</td>
                <td className="border p-2">{admin.email}</td>
                <td className="border p-2">{admin.adminType || 'Custom'}</td>
                <td className="border p-2 text-sm">{(admin.permissions || []).length}</td>
                <td className="border p-2">{admin.status}</td>
                <td className="border p-2">
                  {admin.adminMeta?.createdBy?.name || '-'}
                </td>
                <td className="border p-2">
                  {admin.adminMeta?.lastLoginAt
                    ? new Date(admin.adminMeta.lastLoginAt).toLocaleString()
                    : '-'}
                </td>
                <td className="border p-2 space-x-1">
                  <button className="text-blue-600" onClick={() => openEdit(admin)}>
                    Edit
                  </button>
                  <button
                    className="text-green-600"
                    onClick={() => handleStatusToggle(admin)}
                  >
                    {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                  {admin.status !== 'Suspended' && (
                    <button className="text-orange-600" onClick={() => handleSuspend(admin)}>
                      Suspend
                    </button>
                  )}
                  <button className="text-red-600" onClick={() => handleDelete(admin._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
