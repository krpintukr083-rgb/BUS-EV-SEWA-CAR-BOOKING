import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Check, Eye, X } from 'lucide-react';

export default function ScheduleApproval() {
  const [schedules, setSchedules] = useState([]);
  const [status, setStatus] = useState('Pending');
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const load = async () => { try { const res = await adminService.getSchedules(status); setSchedules(res.data || []); setError(''); } catch (e) { setError(e?.response?.data?.message || 'Unable to load schedule approvals'); } };
  useEffect(() => { load(); }, [status]);
  const review = async (schedule, approved) => { try { await (approved ? adminService.approveSchedule(schedule._id) : adminService.rejectSchedule(schedule._id, reason.trim())); setRejecting(null); setReason(''); setSelected(null); load(); } catch (e) { setError(e?.response?.data?.message || 'Unable to update schedule approval'); } };
  return <div className="page-container">
    <div className="card-header-flex"><div><h1>Schedule Approval</h1><p style={{ color: '#64748b' }}>Review driver-submitted routes and departure schedules.</p></div><select className="form-control" style={{ width: 160 }} value={status} onChange={e => setStatus(e.target.value)}><option value="Pending">Pending</option><option value="Active">Approved</option><option value="Rejected">Rejected</option></select></div>
    {error && <p className="error-message">{error}</p>}<div className="content-card"><div className="table-responsive"><table className="data-table"><thead><tr><th>Route</th><th>Date & departure</th><th>Vehicle</th><th>Driver</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {schedules.map(s => <tr key={s._id}><td><strong>{s.origin} → {s.destination}</strong></td><td>{s.departureTime || '—'}{s.arrivalTime ? ` – ${s.arrivalTime}` : ''}</td><td>{s.vehicle?.vehicleNumber || '—'}</td><td>{s.driver?.name || '—'}</td><td><StatusBadge status={s.status || 'Pending'} />{s.rejectionReason && <div style={{ color: '#64748b', fontSize: '.78rem' }}>{s.rejectionReason}</div>}</td><td><button className="btn btn-sm btn-outline" onClick={() => setSelected(s)}><Eye size={13} /> Details</button>{status === 'Pending' && <><button className="btn btn-sm btn-success" onClick={() => review(s, true)}><Check size={13} /> Approve</button><button className="btn btn-sm btn-danger" onClick={() => setRejecting(s)}>Reject</button></>}</td></tr>)}
      {!schedules.length && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No {status.toLowerCase()} schedules.</td></tr>}
    </tbody></table></div></div>
    {selected && <div className="modal-overlay"><div className="modal-content"><div className="card-header-flex"><h3>Schedule details</h3><button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}><X size={14} /></button></div><p><strong>{selected.origin} → {selected.destination}</strong></p><p>Date: {selected.travelDate ? new Date(selected.travelDate).toLocaleDateString() : '—'} · Submitted: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</p><p>Departure: {selected.departureTime || '—'} · Arrival: {selected.arrivalTime || '—'} · Available seats: {selected.availableSeats ?? selected.vehicle?.busDetails?.availableSeats ?? selected.vehicle?.seatingCapacity ?? '—'}</p><p>Vehicle: {selected.vehicle?.vehicleNumber || '—'} · Driver: {selected.driver?.name || '—'} · Fare: ₹{selected.fareRate || 0}</p>{selected.notes && <p>Notes: {selected.notes}</p>}</div></div>}
    {rejecting && <div className="modal-overlay"><div className="modal-content"><h3>Reject schedule</h3><p style={{ color: '#64748b' }}>A reason is sent to the submitting driver.</p><textarea className="form-control" rows="4" value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter rejection reason" /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}><button className="btn btn-outline" onClick={() => setRejecting(null)}>Cancel</button><button className="btn btn-danger" disabled={!reason.trim()} onClick={() => review(rejecting, false)}>Reject schedule</button></div></div></div>}
  </div>;
}
