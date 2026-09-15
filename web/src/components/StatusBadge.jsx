import React from 'react';

const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-${normalized}`}>{status}</span>;
};

export default StatusBadge;
