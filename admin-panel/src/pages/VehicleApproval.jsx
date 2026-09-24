import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Check, Eye, FileText, Image as ImageIcon, X } from 'lucide-react';

const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const resolveUrl = value => {
  if (!value) return '';
  if (/^(https?:|data:)/i.test(value)) return value;
  return `${SERVER_URL}/${String(value).replace(/^\//, '')}`;
};

export default function VehicleApproval() {
  const [vehicles, setVehicles] = useState([]);
  const [status, setStatus] = useState('Pending');
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // The all-vehicles endpoint includes the reviewed statuses; the pending
      // endpoint alone cannot populate the Active/Rejected filter.
      const res = await adminService.getVehicles();
      setVehicles(res.data || []);
      setError('');
    } catch (e) { setError(e?.response?.data?.message || 'Unable to load vehicle approvals'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => vehicles.filter(v => (v.vehicleStatus || 'Pending') === status), [vehicles, status]);
  const review = async (vehicle, approved) => {
    try {
      await (approved ? adminService.approveVehicle(vehicle._id) : adminService.rejectVehicle(vehicle._id, reason.trim()));
      setRejecting(null); setReason(''); setSelected(null); load();
    } catch (e) { setError(e?.response?.data?.message || 'Unable to update vehicle approval'); }
  };

  return <div className="page-container">
    <div className="card-header-flex"><div><h1>Vehicle Approval</h1><p style={{ color: '#64748b' }}>Review driver-submitted vehicles before adding them to the active fleet.</p></div><select className="form-control" style={{ width: 160 }} value={status} onChange={e => setStatus(e.target.value)}><option>Pending</option><option>Active</option><option>Rejected</option></select></div>
    {error && <p className="error-message">{error}</p>}
    <div className="content-card"><div className="table-responsive"><table className="data-table"><thead><tr><th>Vehicle</th><th>Driver / Owner</th><th>Specs</th><th>Documents</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {!loading && visible.map(v => <tr key={v._id}><td><strong>{v.vehicleNumber}</strong><div style={{ color: '#64748b' }}>{v.vehicleName || v.vehicleModel} • {v.vehicleType}</div><div style={{ color: '#64748b', fontSize: '.75rem' }}>Submitted: {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}</div></td><td>{v.assignedDriver?.name || v.ownerName || '—'}<div style={{ color: '#64748b', fontSize: '.78rem' }}>{v.assignedDriver?.mobileNumber || v.ownerMobileNumber || ''}</div></td><td>{v.seatingCapacity || v.busDetails?.availableSeats || '—'} seats<div style={{ color: '#64748b', fontSize: '.75rem' }}>{v.carDetails?.fuelType || v.evDetails?.batteryCapacity || '—'} · {v.carDetails ? (v.carDetails.ac ? 'AC' : 'Non-AC') : (v.busDetails?.busType || '—')}</div></td><td>{v.vehicleImages?.length ? <span><ImageIcon size={14} /> {v.vehicleImages.length} image(s)</span> : 'No images'}{(v.rcDocument || v.insuranceDocument || v.fitnessDocument || v.permitDocument) && <div><FileText size={14} /> Documents available</div>}</td><td><StatusBadge status={v.vehicleStatus || 'Pending'} /></td><td><button className="btn btn-sm btn-outline" onClick={() => setSelected(v)}><Eye size={13} /> Details</button>{status === 'Pending' && <><button className="btn btn-sm btn-success" onClick={() => review(v, true)}><Check size={13} /> Approve</button><button className="btn btn-sm btn-danger" onClick={() => setRejecting(v)}>Reject</button></>}</td></tr>)}
      {!loading && !visible.length && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No {status.toLowerCase()} vehicle approvals.</td></tr>}
    </tbody></table></div></div>
    {selected && <div className="modal-overlay"><div className="modal-content" style={{ maxWidth: 720 }}><div className="card-header-flex"><h3>Vehicle details</h3><button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}><X size={14} /></button></div><p><strong>{selected.vehicleNumber}</strong> · {selected.vehicleName || selected.vehicleModel} · {selected.vehicleType}</p><p>Owner: {selected.ownerName || '—'} · Driver: {selected.assignedDriver?.name || '—'} · Submitted: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</p><p>Seats: {selected.seatingCapacity || selected.busDetails?.availableSeats || '—'} · Fuel: {selected.carDetails?.fuelType || '—'} · AC: {selected.carDetails ? (selected.carDetails.ac ? 'Yes' : 'No') : '—'}</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>{(selected.vehicleImages || []).map((img, i) => <a key={i} href={resolveUrl(img)} target="_blank" rel="noreferrer"><div><img src={resolveUrl(img)} alt={i === 0 ? 'Front Vehicle Photo' : i === 1 ? 'Back Vehicle Photo' : `Vehicle Photo ${i + 1}`} style={{ width: 150, height: 100, objectFit: 'cover', borderRadius: 6 }} /><div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{i === 0 ? 'Front Vehicle Photo' : i === 1 ? 'Back Vehicle Photo' : `Vehicle Photo ${i + 1}`}</div></div></a>)}</div><div style={{ marginTop: 16 }}>{['rcDocument', 'insuranceDocument', 'fitnessDocument', 'permitDocument'].map(key => selected[key] && <a key={key} className="btn btn-sm btn-outline" style={{ marginRight: 6 }} href={resolveUrl(selected[key])} target="_blank" rel="noreferrer"><FileText size={13} /> {key.replace('Document', '')}</a>)}</div></div></div>}
    {rejecting && <div className="modal-overlay"><div className="modal-content"><h3>Reject vehicle</h3><p style={{ color: '#64748b' }}>A reason is sent to the submitting driver.</p><textarea className="form-control" rows="4" value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter rejection reason" /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}><button className="btn btn-outline" onClick={() => setRejecting(null)}>Cancel</button><button className="btn btn-danger" disabled={!reason.trim()} onClick={() => review(rejecting, false)}>Reject vehicle</button></div></div></div>}
  </div>;
}
