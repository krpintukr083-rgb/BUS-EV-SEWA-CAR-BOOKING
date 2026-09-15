import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { GitPullRequest, Truck, UserCheck, Check, AlertCircle } from 'lucide-react';

const DriverAssignment = () => {
  const [data, setData] = useState({ assignments: [], availableDrivers: [] });
  const [loading, setLoading] = useState(true);
  const [savingVehicleId, setSavingVehicleId] = useState(null);
  const [selectedDrivers, setSelectedDrivers] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchAssignments = async () => {
    try {
      const res = await adminService.getDriverAssignments();
      if (res.success) {
        setData(res.data);
        const map = {};
        res.data.assignments.forEach(a => {
          map[a.vehicleId] = a.currentDriver?.id || '';
        });
        setSelectedDrivers(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleDriverChange = (vehicleId, driverId) => {
    setSelectedDrivers(prev => ({
      ...prev,
      [vehicleId]: driverId
    }));
  };

  const handleSaveAssignment = async (vehicleId) => {
    setSavingVehicleId(vehicleId);
    setMessage('');
    setError('');

    const newDriverId = selectedDrivers[vehicleId];
    try {
      const res = await adminService.assignDriverToVehicle(vehicleId, newDriverId);
      if (res.success) {
        setMessage(res.message);
        await fetchAssignments();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update assignment');
    } finally {
      setSavingVehicleId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading assignment workspace...</div>;
  }

  const { assignments, availableDrivers } = data;

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Vehicle Driver Assignment Hub</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Assign or reassign active verified drivers to buses, EV-Sewa shuttles, and cars.
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

      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle Name & Number</th>
                <th>Service Type</th>
                <th>Current Driver</th>
                <th>Assignment Status</th>
                <th>Assign / Change Driver</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(item => {
                const currentVal = selectedDrivers[item.vehicleId] ?? (item.currentDriver?.id || '');
                const hasChanged = currentVal !== (item.currentDriver?.id || '');

                return (
                  <tr key={item.vehicleId}>
                    <td>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.vehicleName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: '600' }}>
                        {item.vehicleNumber}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-pending">{item.vehicleType}</span>
                    </td>
                    <td>
                      {item.currentDriver ? (
                        <div>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.currentDriver.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.currentDriver.mobileNumber}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No Driver</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={item.assignmentStatus} />
                    </td>
                    <td style={{ minWidth: '220px' }}>
                      <select
                        className="form-control"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        value={currentVal}
                        onChange={e => handleDriverChange(item.vehicleId, e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {availableDrivers.map(d => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.mobileNumber})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => handleSaveAssignment(item.vehicleId)}
                        className={`btn btn-sm ${hasChanged ? 'btn-primary' : 'btn-outline'}`}
                        disabled={savingVehicleId === item.vehicleId || !hasChanged}
                      >
                        <UserCheck size={14} />
                        <span>{savingVehicleId === item.vehicleId ? 'Saving...' : 'Update Assignment'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DriverAssignment;
