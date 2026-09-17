import React from 'react';

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const s = status.toLowerCase();

  let badgeClass = 'badge ';
  if (['active', 'approved', 'successful', 'confirmed', 'completed', 'assigned', 'paid'].includes(s)) {
    badgeClass += 'badge-active';
  } else if (['pending', 'pending cash', 'inactive', 'requested', 'in progress', 'under_review'].includes(s)) {
    badgeClass += 'badge-pending';
  } else {
    badgeClass += 'badge-blocked';
  }

  return <span className={badgeClass}>{status}</span>;
};

export default StatusBadge;
