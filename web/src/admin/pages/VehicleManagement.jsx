import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { Truck, PlusCircle, Search, Edit, FileText, Check, AlertCircle, Eye, UserCheck } from 'lucide-react';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchVehiclesAndDrivers = async () => {
    try {
      const [vRes, dRes] = await Promise.all([adminService.getVehicles(), adminService.getDrivers()]);
      if (vRes.success) setVehicles(vRes.data);
      if (dRes.success) setDrivers(dRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesAndDrivers();
  }, []);

  const handleStatusChange = async (id, status) => {
    setMessage('');
    try {
      const res = await adminService.updateVehicleStatus(id, status);
      if (res.success) {
        setMessage(res.message);
        await fetchVehiclesAndDrivers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update vehicle status');
    }
  };

  const handleOpenAssignModal = vehicle => {
    setSelectedVehicle(vehicle);
    setSelectedDriverId(vehicle.assignedDriver?._id || vehicle.assignedDriver || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async e => {
    e.preventDefault();
    try {
      const res = await adminService.assignDriverToVehicle(selectedVehicle._id, selectedDriverId);
      if (res.success) {
        setMessage(res.message);
        setIsAssignModalOpen(false);
        await fetchVehiclesAndDrivers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign driver');
    }
  };

  const handleOpenViewModal = vehicle => {
    setSelectedVehicle(vehicle);
    setIsViewModalOpen(true);
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading fleet vehicles...</div>;
  }

  const filteredVehicles = vehicles.filter(v => {
    const matchSearch =
      v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = filterType === 'All' || v.vehicleType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Vehicle Fleet Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Manage buses, electric shuttles, and cars. Note: Inactive & Blocked vehicles cannot take bookings.
          </p>
        </div>
        <Link to="/admin/add-vehicle" className="btn btn-primary">
          <PlusCircle size={16} /> Add Vehicle
        </Link>
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

      {/* Filter Controls */}
      <div className="content-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by vehicle number, name, or owner..."
              className="form-control"
              style={{ border: 'none', backgroundColor: '#f8fafc' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Type:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">All Fleet ({vehicles.length})</option>
              <option value="Bus">Buses Only</option>
              <option value="EV-Sewa">EV-Sewa Only</option>
              <option value="Car">Cars Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle Details</th>
                <th>Type / Category</th>
                <th>Capacity</th>
                <th>Assigned Driver</th>
                <th>Rate / Fare</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map(v => (
                  <tr key={v._id}>
                    <td>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{v.vehicleName}</strong>
                        <div style={{ fontWeight: '700', color: '#1d4ed8', fontSize: '0.85rem' }}>
                          {v.vehicleNumber}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Owner: {v.ownerName}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                        {v.vehicleType}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{v.vehicleCategory}</div>
                    </td>
                    <td style={{ fontWeight: '600' }}>{v.seatingCapacity} Seats</td>
                    <td>
                      {v.assignedDriver ? (
                        <div>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{v.assignedDriver.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.assignedDriver.mobileNumber}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontWeight: '700' }}>₹{v.fareRate}</td>
                    <td>
                      <StatusBadge status={v.vehicleStatus} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleOpenViewModal(v)}
                          className="btn btn-sm btn-outline"
                          title="View Details"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal(v)}
                          className="btn btn-sm btn-outline"
                          title="Assign Driver"
                        >
                          <UserCheck size={13} /> Assign
                        </button>
                        {v.vehicleStatus !== 'Active' && (
                          <button
                            onClick={() => handleStatusChange(v._id, 'Active')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#10b981', borderColor: '#a7f3d0' }}
                          >
                            Activate
                          </button>
                        )}
                        {v.vehicleStatus !== 'Inactive' && (
                          <button
                            onClick={() => handleStatusChange(v._id, 'Inactive')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#f59e0b', borderColor: '#fde68a' }}
                          >
                            Deactivate
                          </button>
                        )}
                        {v.vehicleStatus !== 'Blocked' && (
                          <button
                            onClick={() => handleStatusChange(v._id, 'Blocked')}
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
                    No vehicle records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Vehicle Details Modal */}
      {isViewModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">{selectedVehicle.vehicleName}</h3>
                <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700' }}>
                  {selectedVehicle.vehicleNumber}
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setIsViewModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.875rem' }}>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Vehicle Type</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.vehicleType}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Category & Model</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.vehicleCategory} ({selectedVehicle.vehicleModel})</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Owner Information</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.ownerName} ({selectedVehicle.ownerMobileNumber})</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Assigned Driver</span>
                <div style={{ fontWeight: '700' }}>
                  {selectedVehicle.assignedDriver ? selectedVehicle.assignedDriver.name : 'Unassigned'}
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>RC Number</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.rcNumber}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Insurance Policy Number</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.insurancePolicyNumber} (Exp: {selectedVehicle.insuranceExpiryDetails})</div>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Fitness / Check Details:</span>
              <div style={{ fontWeight: '600' }}>{selectedVehicle.fitnessDetails}</div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Assignment Modal */}
      {isAssignModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header-flex">
              <h3 className="card-title">Assign Driver to {selectedVehicle.vehicleNumber}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setIsAssignModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssignment}>
              <div className="form-group">
                <label className="form-label">Select Driver</label>
                <select
                  className="form-control"
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value)}
                >
                  <option value="">-- Unassign Current Driver --</option>
                  {drivers.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.mobileNumber}) - {d.driverStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;
