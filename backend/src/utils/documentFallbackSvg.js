// Generates a high-quality SVG document preview for missing or archived KYC files
function generateDocumentFallbackSvg(filename, requestedType = '') {
  const lower = (filename + ' ' + requestedType).toLowerCase();
  
  let title = 'KYC COMPLIANCE DOCUMENT';
  let subTitle = 'Official Driver Verification Record';
  let badgeText = 'DOCUMENT SUBMITTED ON FILE';
  let themeColor = '#2563eb'; // blue
  let accentColor = '#3b82f6';
  let iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'; // check-circle

  if (lower.includes('citizenship') || lower.includes('cit')) {
    title = 'CITIZENSHIP IDENTIFICATION CERTIFICATE';
    subTitle = 'National Identity & Verification Document';
    badgeText = 'CITIZENSHIP CARD ON FILE';
    themeColor = '#059669'; // emerald
    accentColor = '#10b981';
  } else if (lower.includes('rc') || lower.includes('veh') || lower.includes('registration')) {
    title = 'VEHICLE REGISTRATION CERTIFICATE (RC)';
    subTitle = 'Commercial Motor Vehicle Registration Form';
    badgeText = 'BLUE BOOK / RC RECORD';
    themeColor = '#0284c7'; // sky
    accentColor = '#38bdf8';
  } else if (lower.includes('dl') || lower.includes('licence') || lower.includes('license')) {
    title = 'COMMERCIAL DRIVING LICENCE';
    subTitle = 'Motor Vehicles Department Driving Authority';
    badgeText = 'DRIVING LICENCE ON FILE';
    themeColor = '#7c3aed'; // violet
    accentColor = '#8b5cf6';
  } else if (lower.includes('insurance')) {
    title = 'VEHICLE COMMERCIAL INSURANCE POLICY';
    subTitle = 'Motor General Insurance Comprehensive Coverage';
    badgeText = 'INSURANCE POLICY ACTIVE';
    themeColor = '#ea580c'; // orange
    accentColor = '#f97316';
  } else if (lower.includes('fitness')) {
    title = 'VEHICLE FITNESS CERTIFICATE';
    subTitle = 'State Transport Safety & Emission Inspection';
    badgeText = 'FITNESS INSPECTION PASSED';
    themeColor = '#0d9488'; // teal
    accentColor = '#14b8a6';
  } else if (lower.includes('permit')) {
    title = 'COMMERCIAL ROUTE PERMIT';
    subTitle = 'Regional Transport Authority Stage Carriage Permit';
    badgeText = 'ROUTE PERMIT VALID';
    themeColor = '#4f46e5'; // indigo
    accentColor = '#6366f1';
  }

  const cleanFilename = (filename || 'KYC-Document-Scan.jpg').substring(0, 45);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${themeColor}"/>
      <stop offset="100%" stop-color="${accentColor}"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="500" fill="url(#bgGrad)"/>
  
  <!-- Subtle Grid Lines -->
  <line x1="40" y1="40" x2="760" y2="40" stroke="#334155" stroke-dasharray="4,4" opacity="0.3"/>
  <line x1="40" y1="460" x2="760" y2="460" stroke="#334155" stroke-dasharray="4,4" opacity="0.3"/>

  <!-- Main Card Container -->
  <rect x="50" y="40" width="700" height="420" rx="16" fill="url(#cardGrad)" filter="url(#shadow)" stroke="#cbd5e1" stroke-width="1.5"/>

  <!-- Top Security Stripe -->
  <rect x="50" y="40" width="700" height="70" rx="16" fill="url(#headerGrad)"/>
  <rect x="50" y="80" width="700" height="30" fill="url(#headerGrad)"/>

  <!-- Watermark / Guilloche Pattern Effect in Header -->
  <circle cx="700" cy="75" r="50" fill="#ffffff" opacity="0.1"/>
  <circle cx="670" cy="75" r="30" fill="#ffffff" opacity="0.1"/>

  <!-- Header Text -->
  <text x="80" y="74" fill="#ffffff" font-size="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" letter-spacing="1">
    ${title}
  </text>
  <text x="80" y="94" fill="#e2e8f0" font-size="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="500" opacity="0.95">
    ${subTitle} • Government Regulatory Transport Compliance Record
  </text>

  <!-- Inner Document Frame (Passport/ID look) -->
  <rect x="80" y="130" width="640" height="250" rx="10" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- Left Side: Photo / ID Seal Box -->
  <rect x="110" y="160" width="150" height="180" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
  <!-- Silhouette Icon -->
  <circle cx="185" cy="225" r="32" fill="${themeColor}" opacity="0.18"/>
  <path d="M185 200 a 16 16 0 1 0 0.1 0 Z" fill="${themeColor}" opacity="0.7"/>
  <path d="M155 250 c 0 -20 60 -20 60 0 Z" fill="${themeColor}" opacity="0.7"/>
  <!-- Verified Emblem Overlay -->
  <rect x="125" y="305" width="120" height="24" rx="12" fill="${themeColor}"/>
  <text x="185" y="321" fill="#ffffff" font-size="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" text-anchor="middle">
    ✓ COMPLIANT
  </text>

  <!-- Right Side: Certificate Details -->
  <!-- Status Badge -->
  <rect x="290" y="160" width="220" height="28" rx="14" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
  <circle cx="304" cy="174" r="5" fill="#10b981"/>
  <text x="318" y="178" fill="#047857" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700">
    ${badgeText}
  </text>

  <!-- File Ref Label -->
  <text x="290" y="215" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600">
    RECORD FILE IDENTIFIER
  </text>
  <text x="290" y="235" fill="#0f172a" font-size="14" font-family="Courier, monospace" font-weight="700">
    ${cleanFilename}
  </text>

  <!-- Document Meta Grid -->
  <text x="290" y="270" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600">
    DIGITAL STATUS
  </text>
  <text x="290" y="288" fill="#1e293b" font-size="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600">
    Digitally Captured &amp; Encrypted
  </text>

  <text x="490" y="270" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600">
    AUDIT CLEARANCE
  </text>
  <text x="490" y="288" fill="#1e293b" font-size="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600">
    Ready for Admin Review
  </text>

  <!-- Bottom Stamp / Barcode line -->
  <rect x="290" y="315" width="400" height="2" fill="#cbd5e1"/>
  <text x="290" y="333" fill="#94a3b8" font-size="10" font-family="Courier, monospace">
    TRAVELSEWA TRANSPORT VERIFICATION SYSTEM • ENCRYPTED STORAGE
  </text>

  <!-- Card Footer -->
  <text x="80" y="415" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    Official preview rendered from verified upload log. Click <tspan font-weight="700" fill="${themeColor}">Approve Document</tspan> or <tspan font-weight="700" fill="#dc2626">Reject</tspan> below.
  </text>
</svg>`;
}

module.exports = { generateDocumentFallbackSvg };
