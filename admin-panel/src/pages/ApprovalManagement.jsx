import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';

export default function ApprovalManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const [v, s] = await Promise.all([adminService.getPendingVehicles(), adminService.getPendingSchedules()]);
      setVehicles(v.data || []); setSchedules(s.data || []); setError('');
    } catch (e) { setError(e?.response?.data?.message || 'Unable to load approvals'); }
  };
  useEffect(() => { load(); }, []);
  const action = async (fn, id) => { try { await fn(id); load(); } catch (e) { setError(e?.response?.data?.message || 'Action failed'); } };
  return <div className="page-container">
    <h1>Driver approvals</h1>{error && <p className="error-message">{error}</p>}
    <section><h2>Pending vehicles ({vehicles.length})</h2>
      {vehicles.map(v => <div className="card" key={v._id}><strong>{v.vehicleNumber}</strong> — {v.vehicleType} — {v.assignedDriver?.name || 'Driver'}
        <button onClick={() => action(adminService.approveVehicle, v._id)}>Approve</button>
        <button onClick={() => action(id => adminService.rejectVehicle(id, 'Rejected by admin'), v._id)}>Reject</button>
      </div>)}
    </section>
    <section><h2>Pending schedules ({schedules.length})</h2>
      {schedules.map(s => <div className="card" key={s._id}><strong>{s.origin} → {s.destination}</strong> — {s.travelDate?.slice(0, 10)} — {s.driver?.name || 'Driver'}
        <button onClick={() => action(adminService.approveSchedule, s._id)}>Approve</button>
        <button onClick={() => action(id => adminService.rejectSchedule(id, 'Rejected by admin'), s._id)}>Reject</button>
      </div>)}
    </section>
  </div>;
}
