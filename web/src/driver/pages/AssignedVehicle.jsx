import React, { useState, useEffect } from 'react';
import { driverService } from '../../services/driverService';
import StatusBadge from '../../components/StatusBadge';
import { Truck, ShieldCheck, FileText, CheckCircle2, User, Phone, MapPin } from 'lucide-react';

const AssignedVehicle = () => {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await driverService.getAssignedVehicle();
        if (res.success) {
          setVehicle(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading assigned vehicle...</div>;
  }

  if (!vehicle) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <Truck size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>No Assigned Vehicle Found</h3>
        <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
          You do not have any vehicle assigned to your driver account currently. Please contact the platform fleet administrator.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Vehicle Hero Card */}
      <div className="content-card">
        <div className="card-header-flex">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{vehicle.vehicleName}</h2>
              <StatusBadge status={vehicle.vehicleStatus} />
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
              {vehicle.vehicleModel} • {vehicle.vehicleCategory}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
              Vehicle Registration No.
            </span>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1d4ed8' }}>{vehicle.vehicleNumber}</div>
          </div>
        </div>

        {/* Vehicle Image Gallery */}
        {vehicle.vehicleImages && vehicle.vehicleImages.length > 0 && (
          <div style={{ marginBottom: '24px', borderRadius: '10px', overflow: 'hidden', maxHeight: '280px' }}>
            <img
              src={vehicle.vehicleImages[0]}
              alt="Assigned Vehicle"
              style={{ width: '100%', height: '280px', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Specifications Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Service Type</span>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {vehicle.vehicleType}
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Seating Capacity</span>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {vehicle.seatingCapacity} Passengers
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Owner Name</span>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {vehicle.ownerName}
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Owner Contact</span>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {vehicle.ownerMobileNumber}
            </div>
          </div>
        </div>

        {/* Route Details if present */}
        {vehicle.route && vehicle.route.origin && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', fontWeight: '700', marginBottom: '8px' }}>
              <MapPin size={18} />
              <span>Assigned Route & Schedule</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#1e3a8a', fontWeight: '600' }}>
              {vehicle.route.origin} → {vehicle.route.destination}
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Legal & Compliance Documents */}
      <div className="content-card">
        <div className="card-header-flex">
          <h3 className="card-title">Vehicle Compliance & Documents</h3>
          <span className="badge badge-active">
            <ShieldCheck size={14} /> Verified Legal Fleet
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* RC Card */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={18} color="#1d4ed8" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Registration Certificate (RC)</h4>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>RC Number:</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>{vehicle.rcNumber}</div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> Valid Commercial RC On File
            </div>
          </div>

          {/* Insurance Card */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} color="#1d4ed8" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Vehicle Insurance</h4>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Policy Number:</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>{vehicle.insurancePolicyNumber}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
              Expiry Date: <strong style={{ color: '#0f172a' }}>{vehicle.insuranceExpiryDetails}</strong>
            </div>
          </div>

          {/* Fitness Certificate Card */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Vehicle Fitness / Check Details</h4>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Inspection Status:</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>{vehicle.fitnessDetails}</div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#10b981' }}>
              Passed State Transport Department Safety Check
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignedVehicle;
