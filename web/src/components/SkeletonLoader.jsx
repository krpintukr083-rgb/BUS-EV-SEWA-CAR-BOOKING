import React from 'react';

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#1e293b',
        background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
        ...style
      }}
    />
  );
};

export const DashboardSkeleton = ({ role = 'admin' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner Skeleton */}
      <div
        className="content-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px' }}>
          <Skeleton width="180px" height="24px" />
          <Skeleton width="320px" height="16px" />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Skeleton width="110px" height="36px" />
          <Skeleton width="110px" height="36px" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="stats-grid">
        {Array.from({ length: role === 'admin' ? 8 : 4 }).map((_, idx) => (
          <div
            key={idx}
            className="stat-card"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="100px" height="14px" />
              <Skeleton width="32px" height="32px" borderRadius="8px" />
            </div>
            <Skeleton width="80px" height="28px" />
          </div>
        ))}
      </div>

      {/* Table / Details Skeleton */}
      <div className="content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton width="220px" height="20px" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Skeleton width="100%" height="44px" />
          <Skeleton width="100%" height="44px" />
          <Skeleton width="100%" height="44px" />
        </div>
      </div>
    </div>
  );
};
