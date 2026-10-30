import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Safely format date and time
 */
const formatDateTime = (date = new Date()) => {
  try {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(date);
  }
};

/**
 * Convert an image URL to Base64 in browser environment
 */
const loadLogoAsBase64 = async (url = '/logo.png') => {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Generate and download a professional Passenger Manifest PDF
 *
 * @param {Object} options
 * @param {Object} options.journey - Active journey object
 * @param {Array}  options.passengers - Passenger rows to include
 * @param {Object} [options.summary] - Summary totals (optional)
 * @param {Object} [options.filterInfo] - Filter info if filtered (optional)
 * @param {string} [options.logoUrl] - Logo URL (optional)
 * @param {'save'|'arraybuffer'|'blob'} [options.returnOutput='save'] - Download or return buffer
 * @returns {Promise<{ success: boolean, filename: string, referenceNo: string, totalPassengers: number, totalPages: number, pdfBytes?: ArrayBuffer }>}
 */
export const generatePassengerManifestPdf = async ({
  journey,
  passengers = [],
  summary = null,
  filterInfo = null,
  logoUrl = '/logo.png',
  returnOutput = 'save'
}) => {
  if (!journey) {
    throw new Error('No journey selected for manifest export.');
  }

  if (!Array.isArray(passengers) || passengers.length === 0) {
    throw new Error('No passenger records found to export for this journey.');
  }

  const service = String(journey.serviceType || journey.vehicleType || 'Bus').trim();
  const isBus = service.toLowerCase() === 'bus';
  const isEv = service.toLowerCase() === 'ev-sewa' || service.toLowerCase() === 'ev';
  const isCar = service.toLowerCase() === 'car';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.width; // 297mm
  const pageHeight = doc.internal.pageSize.height; // 210mm
  const margin = 14;
  const usableWidth = pageWidth - margin * 2; // 269mm

  // Generate unique document reference
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const referenceNo = `YSN-MAN-${dateStamp}-${randCode}`;
  const generatedAt = formatDateTime(new Date());

  // Attempt to load logo (safely ignored in test/node)
  const logoData = await loadLogoAsBase64(logoUrl);

  // 1. Header Area
  let currentY = margin;

  // Header background bar
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.roundedRect(margin, currentY, usableWidth, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY, usableWidth, 24, 2, 2, 'S');

  // Logo / Brand Mark
  let brandTextX = margin + 4;
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin + 3, currentY + 3, 18, 18);
      brandTextX = margin + 24;
    } catch {
      brandTextX = margin + 4;
    }
  }

  // Brand Name & Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138); // #1e3a8a deep royal blue
  doc.text('YatraSewanp.com', brandTextX, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('Unified Intercity Transport Network • Bus • EV-Sewa • Car', brandTextX, currentY + 14);
  doc.text('Official Journey Operations & Passenger Verification Manifest', brandTextX, currentY + 19);

  // Center / Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // #0f172a
  const titleText = 'PASSENGER MANIFEST';
  const titleX = pageWidth / 2 - doc.getTextWidth(titleText) / 2;
  doc.text(titleText, titleX, currentY + 11);

  // Service Type Pill
  const serviceBadgeText = `${service.toUpperCase()} SERVICE`;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(serviceBadgeText) + 8;
  const badgeX = pageWidth / 2 - badgeWidth / 2;
  const badgeY = currentY + 14;

  if (isEv) {
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.setTextColor(255, 255, 255);
  } else if (isCar) {
    doc.setFillColor(139, 92, 246); // violet-500
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setFillColor(37, 99, 235); // blue-600
    doc.setTextColor(255, 255, 255);
  }
  doc.roundedRect(badgeX, badgeY, badgeWidth, 6, 1.5, 1.5, 'F');
  doc.text(serviceBadgeText, badgeX + 4, badgeY + 4.2);

  // Right Side: Reference & Timestamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const refText = `Doc Ref: ${referenceNo}`;
  doc.text(refText, pageWidth - margin - 4 - doc.getTextWidth(refText), currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const genText = `Issued: ${generatedAt}`;
  doc.text(genText, pageWidth - margin - 4 - doc.getTextWidth(genText), currentY + 13);

  const statusText = `Journey Status: ${journey.status || 'Active'}`;
  doc.text(statusText, pageWidth - margin - 4 - doc.getTextWidth(statusText), currentY + 18);

  currentY += 28;

  // 2. Journey Information Box (3-column layout)
  const infoBoxHeight = 24;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, currentY, usableWidth, infoBoxHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY, usableWidth, infoBoxHeight, 2, 2, 'S');

  // Divider lines inside journey box
  const colWidth = usableWidth / 3;
  doc.line(margin + colWidth, currentY + 2, margin + colWidth, currentY + infoBoxHeight - 2);
  doc.line(margin + colWidth * 2, currentY + 2, margin + colWidth * 2, currentY + infoBoxHeight - 2);

  const renderField = (label, value, x, y, maxWidth = colWidth - 8) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // #475569
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label) + 2;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42); // #0f172a
    const safeVal = String(value || 'N/A');
    doc.text(safeVal, x + labelW, y, { maxWidth: maxWidth - labelW });
  };

  // Column 1: Vehicle & Capacity
  const col1X = margin + 4;
  renderField('Vehicle Reg: ', journey.vehicleNumber || 'N/A', col1X, currentY + 6);
  renderField('Model / Name: ', `${journey.vehicleName || ''}${journey.vehicleModel ? ` (${journey.vehicleModel})` : ''}` || 'N/A', col1X, currentY + 12);
  renderField('Capacity: ', `${journey.seatingCapacity || 'N/A'} Seats (${service})`, col1X, currentY + 18);

  // Column 2: Route & Timing
  const col2X = margin + colWidth + 4;
  renderField('Route: ', `${journey.origin || 'N/A'} -> ${journey.destination || 'N/A'}`, col2X, currentY + 6);
  renderField('Travel Date: ', journey.travelDate || 'All Dates / On-Demand', col2X, currentY + 12);
  renderField('Departure: ', `${journey.departureTime || 'On Schedule'}${journey.arrivalTime ? ` | Arr: ${journey.arrivalTime}` : ''}`, col2X, currentY + 18);

  // Column 3: Operator & Driver
  const col3X = margin + colWidth * 2 + 4;
  renderField('Operator: ', journey.operatorName || 'Self / Fleet Operator', col3X, currentY + 6);
  renderField('Driver Name: ', journey.driverName || 'Not Assigned', col3X, currentY + 12);
  renderField('Driver Contact: ', `${journey.driverPhone || 'N/A'}${journey.driverLicense ? ` (Lic: ${journey.driverLicense})` : ''}`, col3X, currentY + 18);

  currentY += infoBoxHeight + 4;

  // If a filter is currently active, render an informative callout banner
  if (filterInfo && filterInfo.isFiltered) {
    doc.setFillColor(254, 249, 195); // #fef9c3 yellow-100
    doc.roundedRect(margin, currentY, usableWidth, 7, 1, 1, 'F');
    doc.setDrawColor(253, 224, 71); // #fde047 yellow-300
    doc.roundedRect(margin, currentY, usableWidth, 7, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 98, 7); // #a16207 yellow-700
    const filterNotice = `ACTIVE FILTER: Status = "${filterInfo.status || 'All'}" | Boarding = "${filterInfo.boardingPoint || 'All'}" | Search = "${filterInfo.search || 'None'}" (Showing ${passengers.length} matching of ${filterInfo.totalRecords || passengers.length} records)`;
    doc.text(filterNotice, margin + 4, currentY + 4.8);
    currentY += 9;
  }

  // 3. Service-Specific Passenger Details Table
  let tableHeaders = [];
  let tableRows = [];
  let columnStyles = {};

  if (isBus) {
    tableHeaders = [
      'S.N.',
      'Seat',
      'Booking ID',
      'Passenger Name',
      'Age / Gen',
      'Mobile Number',
      'Boarding Point',
      'Drop Location',
      'Booking Status',
      'Payment'
    ];

    columnStyles = {
      0: { cellWidth: 10, halign: 'center' }, // S.N.
      1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }, // Seat
      2: { cellWidth: 26, fontStyle: 'bold' }, // Booking ID
      4: { cellWidth: 18, halign: 'center' }, // Age / Gen
      5: { cellWidth: 28 }, // Mobile
      8: { cellWidth: 22, halign: 'center' }, // Status
      9: { cellWidth: 20, halign: 'center' } // Payment
    };

    tableRows = passengers.map((p, idx) => {
      const ageGen = p.age !== null && p.age !== undefined
        ? `${p.age}y / ${p.gender || '-'}`
        : (p.gender || 'N/A');

      let nameText = p.passengerName || 'N/A';
      if (p.isLeadPassenger && p.passengerCountInBooking > 1) {
        nameText += ` (Lead - ${p.passengerCountInBooking} pax)`;
      }

      return [
        idx + 1,
        p.seatNumber || 'N/A',
        p.bookingId || p.bookingReference || 'N/A',
        nameText,
        ageGen,
        p.mobileNumber || p.phone || 'N/A',
        p.boardingPoint || 'N/A',
        p.destination || p.dropLocation || 'N/A',
        p.bookingStatus || 'Confirmed',
        p.paymentStatus || 'Completed'
      ];
    });
  } else if (isEv) {
    tableHeaders = [
      'S.N.',
      'Booking ID',
      'Passenger / Customer',
      'Contact',
      'Pickup Location',
      'Drop Location',
      'Pax',
      'Ride Status',
      'Fare (NPR)',
      'Payment'
    ];

    columnStyles = {
      0: { cellWidth: 10, halign: 'center' }, // S.N.
      1: { cellWidth: 26, fontStyle: 'bold' }, // Booking ID
      3: { cellWidth: 28 }, // Contact
      6: { cellWidth: 14, halign: 'center' }, // Pax
      7: { cellWidth: 24, halign: 'center' }, // Ride Status
      8: { cellWidth: 22, halign: 'right' }, // Fare
      9: { cellWidth: 20, halign: 'center' } // Payment
    };

    tableRows = passengers.map((p, idx) => {
      let nameText = p.passengerName || p.customer?.name || 'N/A';
      if (p.isLeadPassenger && p.passengerCountInBooking > 1) {
        nameText += ` (Group - ${p.passengerCountInBooking} pax)`;
      }

      const paxCount = p.passengerCountInBooking || p.paxCount || 1;
      const fareStr = p.fare !== undefined && p.fare !== null ? Number(p.fare).toLocaleString() : 'N/A';

      return [
        idx + 1,
        p.bookingId || 'N/A',
        nameText,
        p.mobileNumber || p.phone || 'N/A',
        p.pickupLocation || p.boardingPoint || 'N/A',
        p.dropLocation || p.destination || 'N/A',
        paxCount,
        p.rideStatus || p.bookingStatus || 'Accepted',
        fareStr,
        p.paymentStatus || 'Paid'
      ];
    });
  } else {
    // Car Service
    tableHeaders = [
      'S.N.',
      'Booking ID',
      'Passenger / Customer',
      'Contact',
      'Pickup Location',
      'Drop Location',
      'Pax',
      'Ride Status',
      'Fare (NPR)',
      'Payment'
    ];

    columnStyles = {
      0: { cellWidth: 10, halign: 'center' }, // S.N.
      1: { cellWidth: 26, fontStyle: 'bold' }, // Booking ID
      3: { cellWidth: 28 }, // Contact
      6: { cellWidth: 14, halign: 'center' }, // Pax
      7: { cellWidth: 24, halign: 'center' }, // Ride Status
      8: { cellWidth: 22, halign: 'right' }, // Fare
      9: { cellWidth: 20, halign: 'center' } // Payment
    };

    tableRows = passengers.map((p, idx) => {
      let nameText = p.passengerName || p.customer?.name || 'N/A';
      if (p.isLeadPassenger && p.passengerCountInBooking > 1) {
        nameText += ` (Booking - ${p.passengerCountInBooking} pax)`;
      }

      const paxCount = p.passengerCountInBooking || p.paxCount || 1;
      const fareStr = p.fare !== undefined && p.fare !== null ? Number(p.fare).toLocaleString() : 'N/A';

      return [
        idx + 1,
        p.bookingId || 'N/A',
        nameText,
        p.mobileNumber || p.phone || 'N/A',
        p.pickupLocation || p.boardingPoint || 'N/A',
        p.dropLocation || p.destination || 'N/A',
        paxCount,
        p.rideStatus || p.bookingStatus || 'Accepted',
        fareStr,
        p.paymentStatus || 'Paid'
      ];
    });
  }

  // Draw Passenger Table via autoTable
  const renderTable = typeof autoTable === 'function' ? autoTable : (autoTable?.default || doc.autoTable);
  renderTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    tableWidth: 'auto',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59], // #1e293b
      lineColor: [226, 232, 240], // #e2e8f0
      lineWidth: 0.15,
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [30, 58, 138], // #1e3a8a deep royal navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      minCellHeight: 8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // #f8fafc slate-50
    },
    columnStyles,
    margin: { left: margin, right: margin, bottom: 22 },
    didDrawPage: () => {
      // Running header on pages 2+
      if (doc.internal.getNumberOfPages() > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `YatraSewanp.com — PASSENGER MANIFEST (${service.toUpperCase()} | Vehicle: ${journey.vehicleNumber || 'N/A'} | Date: ${journey.travelDate || 'All Dates'})`,
          margin,
          9
        );
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, 11, pageWidth - margin, 11);
      }
    }
  });

  // Calculate summary metrics
  const uniqueBookings = new Set(passengers.map(p => p.bookingId).filter(Boolean));
  const totalBookingsCount = uniqueBookings.size || passengers.length;
  const totalPassengersCount = passengers.length;

  const confirmedCount = passengers.filter(p =>
    ['Confirmed', 'Admin Confirmed', 'ADMIN_CONFIRMED', 'Completed', 'Started', 'Accepted'].includes(p.bookingStatus)
  ).length;

  const cancelledCount = passengers.filter(p =>
    ['Cancelled', 'Rejected'].includes(p.bookingStatus)
  ).length;

  const pendingCount = totalPassengersCount - confirmedCount - cancelledCount;

  // Calculate Total Fare where fare is numeric
  let totalFareAmount = 0;
  let hasValidFare = false;
  passengers.forEach(p => {
    if (p.fare !== undefined && p.fare !== null && !isNaN(Number(p.fare))) {
      totalFareAmount += Number(p.fare);
      hasValidFare = true;
    }
  });

  // Check remaining page space for Summary & Sign-off block
  const finalY = doc.lastAutoTable.finalY + 6;
  const neededSpace = 32;
  if (finalY + neededSpace > pageHeight - 16) {
    doc.addPage();
    currentY = 16;
  } else {
    currentY = finalY;
  }

  // Draw Summary Card
  const summaryBoxWidth = usableWidth;
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.roundedRect(margin, currentY, summaryBoxWidth, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY, summaryBoxWidth, 14, 1.5, 1.5, 'S');

  // Summary Metrics inside box
  const sumColW = summaryBoxWidth / 6;
  const renderSummaryMetric = (label, val, colIdx) => {
    const x = margin + sumColW * colIdx + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), x, currentY + 11);
  };

  renderSummaryMetric('TOTAL BOOKINGS', totalBookingsCount, 0);
  renderSummaryMetric('TOTAL PASSENGERS', totalPassengersCount, 1);
  renderSummaryMetric('CONFIRMED', confirmedCount, 2);
  renderSummaryMetric('PENDING / ONGOING', Math.max(0, pendingCount), 3);
  renderSummaryMetric('CANCELLED', cancelledCount, 4);
  renderSummaryMetric('RECORDED FARE', hasValidFare ? `NPR ${totalFareAmount.toLocaleString()}` : 'N/A', 5);

  currentY += 20;

  // Operations Sign-off area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  // Driver signature line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, currentY + 6, margin + 70, currentY + 6);
  doc.text('Assigned Driver Signature', margin + 18, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Name: ${journey.driverName || 'Driver'}`, margin + 18, currentY + 14);

  // Station Dispatcher signature line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.line(margin + usableWidth - 80, currentY + 6, margin + usableWidth - 20, currentY + 6);
  doc.text('Station Manager / Dispatcher Stamp', margin + usableWidth - 78, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Verified & Released for Journey', margin + usableWidth - 78, currentY + 14);

  // 4. Add Page Numbers & Footer on EVERY Page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    // Left footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.text(
      `YatraSewanp.com Passenger Manifest System • Ref: ${referenceNo} • Official Transport Operations Document`,
      margin,
      pageHeight - 6
    );

    // Right footer text: Page X of Y
    const pageText = `Page ${i} of ${totalPages}`;
    doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 6);
  }

  // Generate safe sanitized filename
  const cleanReg = String(journey.vehicleNumber || 'Vehicle').replace(/[\s\-_/\\,.]/g, '_');
  const cleanDate = String(journey.travelDate || 'AllDates').replace(/[\s\-_/\\,.]/g, '_');
  const filename = `Passenger_Manifest_${service}_${cleanReg}_${cleanDate}.pdf`;

  // Trigger browser download if applicable
  if (returnOutput === 'save' && typeof window !== 'undefined' && typeof doc.save === 'function') {
    doc.save(filename);
  }

  const pdfBytes = doc.output('arraybuffer');

  return {
    success: true,
    filename,
    referenceNo,
    totalPassengers: totalPassengersCount,
    totalPages,
    pdfBytes
  };
};

export default generatePassengerManifestPdf;
