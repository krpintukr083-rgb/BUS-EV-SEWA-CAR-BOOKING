import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useAdminAuth } from '../context/AdminAuthContext';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
  };

  const togglePermission = (perm) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const renderPermissionList = () => {
    const perms = adminType === 'custom' ? (allPermissions || []) : [];
    return perms.map((perm) => (
      <label key={perm} className="inline-flex items-center mr-4 mb-2">
        <input
          type="checkbox"
          checked={selectedPermissions.includes(perm)}
          onChange={() => togglePermission(perm)}
          className="mr-1"
        />
        {perm}
      </label>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-96 max-h-screen overflow-auto">
        <h2 className="text-xl font-semibold mb-4">{isEdit ? 'Edit' : 'Create'} Sub‑Admin</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="block text-sm font-medium">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border w-full p-1 rounded"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border w-full p-1 rounded"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">Mobile Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border w-full p-1 rounded"
            />
          </div>
          {!isEdit && (
            <div className="mb-2">
              <label className="block text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border w-full p-1 rounded"
              />
            </div>
          )}
          <div className="mb-2">
            <label className="block text-sm font-medium">Role Type</label>
            <select
              value={adminType}
              onChange={(e) => setAdminType(e.target.value)}
              className="border w-full p-1 rounded"
            >
              {permissionTemplates?.templates && Object.keys(permissionTemplates.templates).map((key) => (
                <option key={key} value={key}>{key.replace('_', ' ')}</option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>
          {adminType === 'custom' && (
            <div className="mb-2 max-h-48 overflow-y-auto border p-2 rounded">
              <p className="font-medium mb-2">Select Permissions:</p>
              {renderPermissionList()}
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <button type="button" onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded">
              {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubAdminFormModal;
