import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = '#1d4ed8', bg = '#eff6ff' }) => {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
      <div className="stat-icon-wrapper" style={{ backgroundColor: bg, color }}>
        {Icon && <Icon size={22} />}
      </div>
    </div>
  );
};

export default StatCard;
