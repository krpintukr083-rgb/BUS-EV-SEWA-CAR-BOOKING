import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { UserCheck, UserPlus, Truck, Search, Check, AlertCircle, Edit, ShieldCheck } from 'lucide-react';

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [drivingLicenceNumber, setDrivingLicenceNumber] = useState('');
  const [assignedVehicle, setAssignedVehicle] = useState('');
  const [driverStatus, setDriverStatus] = useState('Active');
  const [submitting, setSubmitting] = useState(false);

  const fetchDriversAndVehicles = async () => {
    try {
      const [dRes, vRes] = await Promise.all([adminService.getDrivers(), adminService.getVehicles()]);
      if (dRes.success) setDrivers(dRes.data);
      if (vRes.success) setVehicles(vRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversAndVehicles();
  }, []);

  const handleOpenAddModal = () => {
    setName('');
    setMobileNumber('');
    setEmail('');
    setPassword('Driver@123');
    setDrivingLicenceNumber('');
    setAssignedVehicle('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = driver => {
    setCurrentDriver(driver);
    setName(driver.name);
    setMobileNumber(driver.mobileNumber);
    setDrivingLicenceNumber(driver.drivingLicenceNumber);
    setAssignedVehicle(driver.assignedVehicle?._id || driver.assignedVehicle || '');
    setDriverStatus(driver.driverStatus);
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await adminService.addDriver({
        name,
        mobileNumber,
        email,
        password,
        drivingLicenceNumber,
        assignedVehicle: assignedVehicle || undefined
      });
      if (res.success) {
        setMessage('Driver added successfully!');
        setIsAddModalOpen(false);
        await fetchDriversAndVehicles();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await adminService.updateDriver(currentDriver._id, {
        name,
        mobileNumber,
        drivingLicenceNumber,
        driverStatus,
        assignedVehicle: assignedVehicle || null
      });
      if (res.success) {
        setMessage('Driver details updated!');
        setIsEditModalOpen(false);
        await fetchDriversAndVehicles();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    setMessage('');
    try {
      const res = await adminService.updateDriverStatus(id, status);
      if (res.success) {
        setMessage(`Driver status updated to ${status}`);
        await fetchDriversAndVehicles();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change status');
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading fleet drivers...</div>;
  }

  const filteredDrivers = drivers.filter(d => {
    return (
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.mobileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.drivingLicenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Fleet Driver Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Add, verify, assign vehicles, and control driver operational statuses.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/admin/driver-verification" className="btn btn-outline">
            <ShieldCheck size={16} /> Driver Verification Desk
          </Link>
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <UserPlus size={16} /> Add New Driver
          </button>
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

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="content-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search drivers by name, phone, or DL number..."
            className="form-control"
            style={{ border: 'none', backgroundColor: '#f8fafc' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Drivers Data Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Profile</th>
                <th>Mobile Number</th>
                <th>DL Number</th>
                <th>Assigned Vehicle</th>
                <th>Licence / RC Status</th>
                <th>Driver Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map(d => (
                  <tr key={d._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={d.profilePhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'}
                          alt=""
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{d.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {d._id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#334155' }}>{d.mobileNumber}</td>
                    <td>
                      <code>{d.drivingLicenceNumber}</code>
                    </td>
                    <td>
                      {d.assignedVehicle ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Truck size={14} color="#1d4ed8" />
                          <span>
                            {d.assignedVehicle.vehicleName || 'Vehicle'} ({d.assignedVehicle.vehicleNumber})
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <StatusBadge status={d.drivingLicenceStatus} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={d.driverStatus} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleOpenEditModal(d)}
                          className="btn btn-sm btn-outline"
                          title="Edit Driver"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        {d.driverStatus !== 'Active' && (
                          <button
                            onClick={() => handleStatusChange(d._id, 'Active')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#10b981', borderColor: '#a7f3d0' }}
                          >
                            Activate
                          </button>
                        )}
                        {d.driverStatus !== 'Inactive' && (
                          <button
                            onClick={() => handleStatusChange(d._id, 'Inactive')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#f59e0b', borderColor: '#fde68a' }}
                          >
                            Deactivate
                          </button>
                        )}
                        {d.driverStatus !== 'Blocked' && (
                          <button
                            onClick={() => handleStatusChange(d._id, 'Blocked')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No driver records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="card-header-flex">
              <h3 className="card-title">Add New Fleet Driver</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setIsAddModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91..."
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="driver@domain.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Commercial DL Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="DL-XXXXXXXXXXXX"
                    value={drivingLicenceNumber}
                    onChange={e => setDrivingLicenceNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Vehicle</label>
                  <select
                    className="form-control"
                    value={assignedVehicle}
                    onChange={e => setAssignedVehicle(e.target.value)}
                  >
                    <option value="">-- Leave Unassigned --</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.vehicleName} ({v.vehicleNumber}) - {v.vehicleType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding Driver...' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="card-header-flex">
              <h3 className="card-title">Edit Driver: {currentDriver?.name}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Driver Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Commercial DL Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={drivingLicenceNumber}
                    onChange={e => setDrivingLicenceNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Status</label>
                  <select
                    className="form-control"
                    value={driverStatus}
                    onChange={e => setDriverStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Vehicle</label>
                <select
                  className="form-control"
                  value={assignedVehicle}
                  onChange={e => setAssignedVehicle(e.target.value)}
                >
                  <option value="">-- No Vehicle Assigned --</option>
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.vehicleName} ({v.vehicleNumber}) - {v.vehicleType}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Update Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
