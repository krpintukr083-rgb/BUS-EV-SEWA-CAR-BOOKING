import React from 'react';

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const s = status.toLowerCase();

  let badgeClass = 'badge ';
  if (['active', 'approved', 'successful', 'confirmed', 'completed', 'payment done', 'assigned', 'processed'].includes(s)) {
    badgeClass += 'badge-active';
  } else if (['pending', 'inactive', 'requested', 'processing', 'in progress', 'under review', 'open'].includes(s)) {
    badgeClass += 'badge-pending';
  } else {
    badgeClass += 'badge-blocked';
  }

  return <span className={badgeClass}>{status}</span>;
};

export default StatusBadge;
