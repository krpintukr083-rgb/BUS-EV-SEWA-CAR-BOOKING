import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
      {Icon && (
        <div className="stat-icon-wrapper" style={color ? { color, backgroundColor: `${color}15` } : {}}>
          <Icon size={22} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
