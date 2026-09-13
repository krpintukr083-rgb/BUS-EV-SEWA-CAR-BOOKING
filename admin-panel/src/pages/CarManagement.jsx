import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Car, MapPin, ShieldCheck, Check } from 'lucide-react';

const CarManagement = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCars = async () => {
    try {
      const res = await adminService.getCars();
      if (res.success) {
        setCars(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await adminService.updateVehicleStatus(id, newStatus);
      if (res.success) {
        await fetchCars();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading car & taxi fleet...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Car & Chauffeur Fleet Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Sedan, SUV, airport taxi, and outstation chauffeur vehicle allocation and monitoring.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {cars.map(car => (
          <div key={car._id} className="content-card">
            <div className="card-header-flex">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    backgroundColor: '#eef2ff',
                    color: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Car size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{car.vehicleName}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Registration: <strong style={{ color: '#4f46e5' }}>{car.vehicleNumber}</strong> • {car.vehicleModel} ({car.vehicleCategory})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatusBadge status={car.vehicleStatus} />
                <button
                  onClick={() => handleStatusToggle(car._id, car.vehicleStatus)}
                  className={`btn btn-sm ${car.vehicleStatus === 'Active' ? 'btn-outline' : 'btn-success'}`}
                >
                  {car.vehicleStatus === 'Active' ? 'Set Inactive' : 'Set Active'}
                </button>
              </div>
            </div>

            {/* Car Specs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fuel / Power Type</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>
                  {car.carDetails?.fuelType || 'Electric / Petrol'} • {car.seatingCapacity} Seater
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Assigned Driver</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>
                  {car.assignedDriver ? car.assignedDriver.name : 'Unassigned'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {car.assignedDriver ? car.assignedDriver.mobileNumber : 'Chauffeur not assigned'}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Standard Base Fare</span>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem' }}>₹{car.fareRate}</div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Compliance Records</span>
                <div style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <ShieldCheck size={14} /> Tourist Permit & RC Clear
                </div>
              </div>
            </div>

            {/* Route & Pickup/Drop */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.85rem', color: '#5b21b6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
                <MapPin size={16} /> Operational Corridor: {car.pickupDropDetails?.pickupLocation || car.route?.origin || 'Airport / Citywide'} → {car.pickupDropDetails?.dropLocation || car.route?.destination || 'Outstation / Metro Hub'}
              </div>
              <div>
                RC: <code>{car.rcNumber}</code> | Insurance: <code>{car.insurancePolicyNumber}</code> (Exp: {car.insuranceExpiryDetails})
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarManagement;
