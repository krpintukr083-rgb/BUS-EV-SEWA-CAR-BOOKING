import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { FileCheck, Shield, FileText, CheckCircle2 } from 'lucide-react';

const DocumentRecords = () => {
  const [activeTab, setActiveTab] = useState('rc'); // 'rc', 'licence', 'insurance', 'fitness'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async tab => {
    setLoading(true);
    try {
      const res = await adminService.getDocumentRecords(tab);
      if (res.success) {
        setRecords(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(activeTab);
  }, [activeTab]);

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Official Compliance & Document Records</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Permanent repository of RC permits, Driving Licences, Commercial Fleet Insurance, and Fitness Certificates.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('rc')}
          className={`btn ${activeTab === 'rc' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <FileText size={16} /> 1. RC Records ({activeTab === 'rc' ? records.length : ''})
        </button>
        <button
          onClick={() => setActiveTab('licence')}
          className={`btn ${activeTab === 'licence' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <FileCheck size={16} /> 2. Driving Licence Records
        </button>
        <button
          onClick={() => setActiveTab('insurance')}
          className={`btn ${activeTab === 'insurance' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <Shield size={16} /> 3. Fleet Insurance Records
        </button>
        <button
          onClick={() => setActiveTab('fitness')}
          className={`btn ${activeTab === 'fitness' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <CheckCircle2 size={16} /> 4. Vehicle Fitness Records
        </button>
      </div>

      {/* Content Table */}
      <div className="content-card">
        {loading ? (
          <div style={{ padding: '24px', color: '#64748b' }}>Loading {activeTab} compliance records...</div>
        ) : (
          <div className="table-responsive">
            {activeTab === 'rc' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle Reg. Number</th>
                    <th>Vehicle Name</th>
                    <th>Owner Name</th>
                    <th>RC Permit Number</th>
                    <th>Assigned Driver</th>
                    <th>Vehicle Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{r.vehicleNumber}</td>
                      <td>{r.vehicleName}</td>
                      <td>{r.ownerName}</td>
                      <td>
                        <code>{r.rcNumber}</code>
                      </td>
                      <td>{r.assignedDriver}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'licence' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Driver Name</th>
                    <th>Contact Phone</th>
                    <th>Commercial DL Number</th>
                    <th>Verification Status</th>
                    <th>Driver Duty Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '700' }}>{r.driverName}</td>
                      <td>{r.mobileNumber}</td>
                      <td>
                        <code>{r.drivingLicenceNumber}</code>
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>
                        <StatusBadge status={r.driverStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'insurance' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle Reg. Number</th>
                    <th>Vehicle Name</th>
                    <th>Policy Number</th>
                    <th>Expiry Date</th>
                    <th>Fleet Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{r.vehicleNumber}</td>
                      <td>{r.vehicleName}</td>
                      <td>
                        <code>{r.policyNumber}</code>
                      </td>
                      <td style={{ fontWeight: '600' }}>{r.expiryDate}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'fitness' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle Reg. Number</th>
                    <th>Vehicle Name</th>
                    <th>Fitness Inspection Details</th>
                    <th>Vehicle Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{r.vehicleNumber}</td>
                      <td>{r.vehicleName}</td>
                      <td>{r.fitnessDetails}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentRecords;
