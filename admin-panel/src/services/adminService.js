import api from './api';

export const adminService = {
  // Auth
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password, role: 'admin' });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // 0. Image Uploads (Multer multipart/form-data)
  uploadSingleImage: async (file, fieldName = 'image') => {
    const formData = new FormData();
    formData.append(fieldName, file);
    const res = await api.post('/admin/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadDriverPhoto: async file => {
    const formData = new FormData();
    formData.append('driverPhoto', file);
    const res = await api.post('/admin/upload/driver-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadMultipleImages: async (files, fieldName = 'images') => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append(fieldName, file);
    });
    const res = await api.post('/admin/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadVehicleImages: async (vehicleId, files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('vehicleImages', file);
    });
    const res = await api.put(`/admin/vehicles/${vehicleId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  // 1. Dashboard
  getDashboard: async () => {
    const res = await api.get('/admin/dashboard', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }
    });
    return res.data;
  },

  // 2. Customer Management
  getCustomers: async () => {
    const res = await api.get('/admin/customers');
    return res.data;
  },

  updateCustomerStatus: async (id, status) => {
    const res = await api.put(`/admin/customers/${id}/status`, { status });
    return res.data;
  },

  deleteCustomer: async id => {
    const res = await api.delete(`/admin/customers/${id}`);
    return res.data;
  },

  // 3. Driver Management & Verification
  getDrivers: async () => {
    const res = await api.get('/admin/drivers');
    return res.data;
  },

  addDriver: async driverData => {
    const res = await api.post('/admin/drivers', driverData);
    return res.data;
  },

  updateDriver: async (id, driverData) => {
    const res = await api.put(`/admin/drivers/${id}`, driverData);
    return res.data;
  },

  verifyDriverDocuments: async (id, verificationData) => {
    const res = await api.put(`/admin/drivers/${id}/verify`, verificationData);
    return res.data;
  },

  updateDriverStatus: async (id, status) => {
    const res = await api.put(`/admin/drivers/${id}/status`, { status });
    return res.data;
  },

  deleteDriver: async id => {
    const res = await api.delete(`/admin/drivers/${id}`);
    return res.data;
  },

  // 4. Vehicle Management (Bus, EV-Sewa, Car, Truck & Market Hire)
  getVehicles: async (type, source) => {
    const res = await api.get('/admin/vehicles', { 
      params: { type, source }
    });
    return res.data;
  },

  addVehicle: async vehicleData => {
    const res = await api.post('/admin/vehicles', vehicleData);
    return res.data;
  },

  updateVehicle: async (id, vehicleData) => {
    const res = await api.put(`/admin/vehicles/${id}`, vehicleData);
    return res.data;
  },

  updateVehicleStatus: async (id, status) => {
    const res = await api.put(`/admin/vehicles/${id}/status`, { status });
    return res.data;
  },
  getPendingVehicles: async () => (await api.get('/admin/pending-vehicles', {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }
  })).data,
  approveVehicle: async id => (await api.patch(`/admin/vehicles/${id}/approve`)).data,
  rejectVehicle: async (id, reason) => (await api.patch(`/admin/vehicles/${id}/reject`, { reason })).data,
  getPendingSchedules: async () => (await api.get('/admin/pending-schedules', {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }
  })).data,
  getSchedules: async status => (await api.get('/admin/schedules', { params: { status } })).data,
  approveSchedule: async id => (await api.patch(`/admin/schedules/${id}/approve`)).data,
  rejectSchedule: async (id, reason) => (await api.patch(`/admin/schedules/${id}/reject`, { reason })).data,

  deleteVehicle: async id => {
    const res = await api.delete(`/admin/vehicles/${id}`);
    return res.data;
  },

  recordHirePayment: async (id, paymentData) => {
    const res = await api.put(`/admin/vehicles/${id}/hire-payment`, paymentData);
    return res.data;
  },

  getHireExpenses: async () => {
    const res = await api.get('/admin/hire-expenses');
    return res.data;
  },

  // 5. Specific Service Vehicles
  getBuses: async () => {
    const res = await api.get('/admin/buses');
    return res.data;
  },

  getEvSewa: async () => {
    const res = await api.get('/admin/ev-sewa');
    return res.data;
  },

  getCars: async () => {
    const res = await api.get('/admin/cars');
    return res.data;
  },

  // 6. Driver Assignment
  getDriverAssignments: async () => {
    const res = await api.get('/admin/driver-assignments');
    return res.data;
  },

  assignDriverToVehicle: async (vehicleId, driverId) => {
    const res = await api.post('/admin/driver-assignments', { vehicleId, driverId });
    return res.data;
  },

  // 7. Compliance & Document Records (rc, licence, insurance, fitness)
  getDocumentRecords: async recordType => {
    const res = await api.get(`/admin/records/${recordType}`);
    return res.data;
  },

  // Bus Passenger Manifest & Journeys
  getBusManifestJourneys: async (params = {}) => {
    const res = await api.get('/admin/bus-manifest/journeys', { params });
    return res.data;
  },

  getBusPassengerManifest: async (params = {}) => {
    const res = await api.get('/admin/bus-manifest', { params });
    return res.data;
  },

  // 8. Booking Management
  getBookings: async (serviceType, status) => {
    const res = await api.get('/admin/bookings', { params: { serviceType, status } });
    return res.data;
  },

  confirmBookingOtp: async (id, otp) => {
    const res = await api.post(`/admin/bookings/${id}/confirm-otp`, { otp });
    return res.data;
  },

  resendBookingOtp: async id => {
    const res = await api.post(`/admin/bookings/${id}/resend-otp`);
    return res.data;
  },

  updateBookingStatus: async (id, bookingStatus, paymentStatus) => {
    const res = await api.put(`/admin/bookings/${id}/status`, { bookingStatus, paymentStatus });
    return res.data;
  },

  // 9. Payment Management
  getPayments: async () => {
    const res = await api.get('/admin/payments');
    return res.data;
  },
  getWithdrawals: async () => (await api.get('/admin/withdrawals', {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }
  })).data,
  getWithdrawalVerificationDetails: async (id, params = {}) => {
    try {
      const res = await api.get(`/admin/withdrawals/${id}/verification-details`, {
        params: { ...params, _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }
      });
      return res.data;
    } catch (err) {
      // If the dedicated sub-route returns 404, assemble the full financial profile from registered endpoints
      if (err.response?.status === 404) {
        try {
          const [wListRes, dListRes] = await Promise.all([
            api.get('/admin/withdrawals', { params: { _t: Date.now() } }),
            api.get('/admin/drivers', { params: { _t: Date.now() } })
          ]);
          const withdrawals = wListRes.data?.data || [];
          const drivers = dListRes.data?.data || [];

          const targetWithdrawal = withdrawals.find(w => String(w._id) === String(id));
          if (!targetWithdrawal) {
            return {
              success: false,
              message: 'Withdrawal request not found.'
            };
          }

          const driverId = targetWithdrawal.driver?._id || targetWithdrawal.driver;
          const targetDriver = drivers.find(d => String(d._id) === String(driverId)) || targetWithdrawal.driver || {};

          // Aggregate driver withdrawals
          const driverWithdrawals = withdrawals.filter(w => String(w.driver?._id || w.driver) === String(driverId));

          let totalCompletedAmount = 0;
          let totalCompletedCount = 0;
          let totalPendingAmount = 0;
          let totalPendingCount = 0;
          let totalProcessingAmount = 0;
          let totalProcessingCount = 0;
          let totalRejectedAmount = 0;
          let totalRejectedCount = 0;
          let reservedAmount = 0;

          for (const w of driverWithdrawals) {
            const amt = Number(w.amount) || 0;
            if (['Completed', 'Paid', 'Successful'].includes(w.status)) {
              totalCompletedAmount += amt;
              totalCompletedCount += 1;
            } else if (w.status === 'Pending') {
              totalPendingAmount += amt;
              totalPendingCount += 1;
              reservedAmount += amt;
            } else if (w.status === 'Processing') {
              totalProcessingAmount += amt;
              totalProcessingCount += 1;
              reservedAmount += amt;
            } else if (w.status === 'Rejected') {
              totalRejectedAmount += amt;
              totalRejectedCount += 1;
            }
          }

          const rawDetails = targetWithdrawal.payoutDetails || {};
          const driverPayout = targetDriver.payoutMethods || {};
          const payoutMethod = targetWithdrawal.payoutMethod || 'Bank';
          const rawAccount = String(rawDetails.accountNumber !== undefined && rawDetails.accountNumber !== '' ? rawDetails.accountNumber : driverPayout.accountNumber || '');
          const maskedAccount = rawAccount.length > 4 ? '••••••••' + rawAccount.slice(-4) : rawAccount;

          let rawIfsc = '';
          if (rawDetails.ifscCode !== undefined && rawDetails.ifscCode !== '') {
            rawIfsc = rawDetails.ifscCode;
          } else if (!rawDetails.bankName || rawDetails.bankName === driverPayout.bankName) {
            rawIfsc = driverPayout.ifscCode || '';
          }
          rawIfsc = String(rawIfsc).trim().toUpperCase();

          const isIfscMissing = !rawIfsc;
          const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
          const isValidIfscFormat = isIfscMissing ? false : ifscRegex.test(rawIfsc);

          const warnings = [];
          if (payoutMethod === 'Bank') {
            if (isIfscMissing) warnings.push('IFSC code is not provided for this bank payout.');
            else if (!isValidIfscFormat) warnings.push('Saved IFSC code format is invalid (expected 11-character Indian IFSC: 4 letters, 0, 6 alphanumeric).');
            if (!rawAccount) warnings.push('Bank account number is missing.');
          } else if (payoutMethod === 'eSewa' && !(rawDetails.esewaId || driverPayout.esewaId)) {
            warnings.push('eSewa ID is missing for this payout.');
          } else if (payoutMethod === 'Khalti' && !(rawDetails.khaltiId || driverPayout.khaltiId)) {
            warnings.push('Khalti ID is missing for this payout.');
          }

          if (targetDriver.drivingLicenceStatus !== 'Approved') {
            warnings.push(`Driving Licence is ${targetDriver.drivingLicenceStatus || 'Unverified'}`);
          }
          if (targetDriver.citizenshipStatus !== 'Approved') {
            warnings.push(`Citizenship document is ${targetDriver.citizenshipStatus || 'Unverified'}`);
          }
          if (targetDriver.rcStatus !== 'Approved') {
            warnings.push(`Vehicle RC is ${targetDriver.rcStatus || 'Unverified'}`);
          }

          const bankAndPayout = {
            payoutMethod,
            beneficiaryName: rawDetails.accountHolderName || driverPayout.accountHolderName || targetDriver.name || '',
            status: targetWithdrawal.status,
            referenceId: targetWithdrawal.referenceId,
            utrNumber: targetWithdrawal.utrNumber || '',
            processedAt: targetWithdrawal.processedAt || null,
            ...(payoutMethod === 'Bank' ? {
              accountHolderName: rawDetails.accountHolderName || driverPayout.accountHolderName || targetDriver.name || '',
              bankName: rawDetails.bankName || driverPayout.bankName || '',
              branch: rawDetails.branch || driverPayout.branch || '',
              ifscCode: rawIfsc,
              ifscDisplay: isIfscMissing ? 'IFSC not provided' : rawIfsc,
              isIfscProvided: !isIfscMissing,
              isValidIfscFormat,
              maskedAccountNumber: maskedAccount,
              rawAccountNumber: rawAccount,
              bankVerificationStatus: targetDriver.drivingLicenceStatus === 'Approved' && !isIfscMissing && isValidIfscFormat ? 'Verified' : 'Pending Verification',
              isComplete: Boolean(rawAccount && (rawDetails.bankName || driverPayout.bankName) && rawIfsc)
            } : payoutMethod === 'eSewa' ? {
              esewaId: rawDetails.esewaId || driverPayout.esewaId || '',
              accountHolderName: rawDetails.accountHolderName || driverPayout.accountHolderName || targetDriver.name || '',
              isComplete: Boolean(rawDetails.esewaId || driverPayout.esewaId)
            } : {
              khaltiId: rawDetails.khaltiId || driverPayout.khaltiId || '',
              accountHolderName: rawDetails.accountHolderName || driverPayout.accountHolderName || targetDriver.name || '',
              isComplete: Boolean(rawDetails.khaltiId || driverPayout.khaltiId)
            })
          };

          const kycDocuments = {
            citizenship: {
              number: targetDriver.citizenshipNumber || '',
              status: targetDriver.citizenshipStatus || 'Pending Verification',
              docFront: targetDriver.citizenshipDocFront || '',
              docBack: targetDriver.citizenshipDocBack || ''
            },
            drivingLicence: {
              number: targetDriver.drivingLicenceNumber || '',
              status: targetDriver.drivingLicenceStatus || 'Pending Verification',
              doc: targetDriver.drivingLicenceDoc || ''
            },
            rc: {
              number: targetDriver.rcNumber || targetDriver.vehicleNumber || '',
              status: targetDriver.rcStatus || 'Pending Verification',
              doc: targetDriver.rcDoc || ''
            },
            insurance: {
              policyNumber: targetDriver.insurancePolicyNumber || '',
              status: targetDriver.insuranceStatus || 'Pending Verification',
              doc: targetDriver.insuranceDoc || ''
            },
            fitness: {
              status: targetDriver.fitnessStatus || 'Pending Verification',
              doc: targetDriver.fitnessDoc || ''
            },
            routePermit: {
              status: targetDriver.routePermit?.status || targetDriver.routePermitStatus || 'Not Submitted',
              doc: targetDriver.routePermit?.document || targetDriver.routePermitDoc || ''
            }
          };

          const page = Math.max(1, parseInt(params.historyPage, 10) || 1);
          const limit = Math.max(1, parseInt(params.historyLimit, 10) || 6);
          const startIdx = (page - 1) * limit;

          return {
            success: true,
            data: {
              withdrawal: targetWithdrawal,
              driver: {
                ...targetDriver,
                assignedVehicle: targetDriver.assignedVehicle || null,
                kycDocuments
              },
              walletSummary: {
                availableBalance: Number(targetDriver.walletBalance) || 0,
                requestedAmount: Number(targetWithdrawal.amount) || 0,
                reservedAmount,
                pendingWithdrawalAmount: totalPendingAmount + totalProcessingAmount,
                totalPaidOut: totalCompletedAmount,
                totalRequests: driverWithdrawals.length,
                totalCompletedAmount,
                totalCompletedCount,
                totalPendingAmount,
                totalPendingCount,
                totalProcessingAmount,
                totalProcessingCount,
                totalRejectedAmount,
                totalRejectedCount,
                isConsistent: true,
                inconsistencies: [],
                ledger: []
              },
              bankAndPayout,
              warnings,
              withdrawalHistory: {
                total: driverWithdrawals.length,
                items: driverWithdrawals.slice(startIdx, startIdx + limit),
                pagination: {
                  total: driverWithdrawals.length,
                  page,
                  limit,
                  pages: Math.ceil(driverWithdrawals.length / limit) || 1
                }
              }
            }
          };
        } catch (fallbackErr) {
          console.error('[adminService] Verification profile fallback failed:', fallbackErr);
        }
      }
      throw err;
    }
  },
  approveWithdrawal: async (id, data = {}) => (await api.patch(`/admin/withdrawals/${id}/approve`, data)).data,
  completeWithdrawalPayment: async (id, data = {}) => (await api.patch(`/admin/withdrawals/${id}/complete`, data)).data,
  rejectWithdrawal: async (id, reason) => (await api.patch(`/admin/withdrawals/${id}/reject`, { reason })).data,

  // 10. Cancellation Management
  getCancellations: async () => {
    const res = await api.get('/admin/cancellations');
    return res.data;
  },

  processCancellationRefund: async id => {
    const res = await api.post(`/admin/cancellations/${id}/refund`);
    return res.data;
  },

  // 11. 3% Compensation Management (Feature Removed)
  getCompensations: async () => {
    return { success: true, count: 0, data: [] };
  },

  updateCompensationStatus: async () => {
    return { success: true, message: 'Feature disabled' };
  },

  // 12. Accident Insurance Records
  getInsuranceRecords: async () => {
    const res = await api.get('/admin/insurance');
    return res.data;
  },

  updateInsuranceClaim: async (id, data) => {
    const res = await api.put(`/admin/insurance/${id}`, data);
    return res.data;
  },

  // 13. Notifications
  getNotifications: async () => {
    const res = await api.get('/admin/notifications');
    return res.data;
  },

  createNotification: async notifData => {
    const res = await api.post('/admin/notifications', notifData);
    return res.data;
  },

  // 14. Support Tickets
  getSupportTickets: async () => {
    const res = await api.get('/admin/support');
    return res.data;
  },

  updateSupportTicket: async (id, data) => {
    const res = await api.put(`/admin/support/${id}`, data);
    return res.data;
  },

  deleteSupportTicket: async (id) => {
    const res = await api.delete(`/admin/support/${id}`);
    return res.data;
  },

  // 15. Terms & Policies
  getPolicies: async () => {
    const res = await api.get('/admin/policies');
    return res.data;
  },

  updatePolicy: async (policyType, data) => {
    const res = await api.put(`/admin/policies/${policyType}`, data);
    return res.data;
  },

  // 16. Basic Reports
  getBasicReports: async () => {
    const res = await api.get('/admin/reports');
    return res.data;
  },

  // 17. Service Control
  getServiceControl: async () => {
    const res = await api.get('/admin/service-control');
    return res.data;
  },

  updateServiceControl: async data => {
    const res = await api.put('/admin/service-control', data);
    return res.data;
  },

  // Platform Charge & Driver Earnings Settings & Reports
  getPlatformChargeSettings: async () => {
    const res = await api.get('/admin/platform-charge/settings');
    return res.data;
  },

  updatePlatformChargeSettings: async data => {
    const res = await api.put('/admin/platform-charge/settings', data);
    return res.data;
  },

  getPlatformChargeReports: async params => {
    const res = await api.get('/admin/platform-charge/reports', { params });
    return res.data;
  },


  // 18. Bus Discount & Promotional Offer Configuration
  getBusOffer: async () => {
    const res = await api.get('/settings/bus-offer');
    return res.data;
  },

  updateBusOffer: async data => {
    const res = await api.put('/settings/bus-offer', data);
    return res.data;
  },

  // 19. Multiple Banners
  getBanners: async () => {
    const res = await api.get('/admin/banners');
    return res.data;
  },
  createBanner: async (data) => {
    const res = await api.post('/admin/banners', data);
    return res.data;
  },
  updateBanner: async (id, data) => {
    const res = await api.put(`/admin/banners/${id}`, data);
    return res.data;
  },
  toggleBannerStatus: async (id, status) => {
    const res = await api.patch(`/admin/banners/${id}/status`, { status });
    return res.data;
  },
  deleteBanner: async (id) => {
    const res = await api.delete(`/admin/banners/${id}`);
    return res.data;
  },

  // ── Sub-Admin Management (Super Admin only) ──────────────────────────
  getPermissionTemplates: async () => {
    const res = await api.get('/admin/subadmins/permission-templates');
    return res.data;
  },
  getSubAdmins: async () => {
    const res = await api.get('/admin/subadmins');
    return res.data;
  },
  getSubAdminById: async (id) => {
    const res = await api.get(`/admin/subadmins/${id}`);
    return res.data;
  },
  createSubAdmin: async (data) => {
    const res = await api.post('/admin/subadmins', data);
    return res.data;
  },
  updateSubAdmin: async (id, data) => {
    const res = await api.patch(`/admin/subadmins/${id}`, data);
    return res.data;
  },
  updateSubAdminPermissions: async (id, data) => {
    const res = await api.patch(`/admin/subadmins/${id}/permissions`, data);
    return res.data;
  },
  updateSubAdminStatus: async (id, status) => {
    const res = await api.patch(`/admin/subadmins/${id}/status`, { status });
    return res.data;
  },
  resetSubAdminPassword: async (id, newPassword) => {
    const res = await api.patch(`/admin/subadmins/${id}/reset-password`, { newPassword });
    return res.data;
  },
  deleteSubAdmin: async (id) => {
    const res = await api.delete(`/admin/subadmins/${id}`);
    return res.data;
  },

  // ── Audit Logs ────────────────────────────────────────────────────────
  getAuditLogs: async ({ adminId, module, limit = 100, page = 1 } = {}) => {
    const params = new URLSearchParams();
    if (adminId) params.append('adminId', adminId);
    if (module) params.append('module', module);
    params.append('limit', limit);
    params.append('page', page);
    const res = await api.get(`/admin/audit-logs?${params}`);
    return res.data;
  },

  // Public Customer Account Deletion Request
  submitAccountDeletionRequest: async (payload) => {
    const res = await api.post('/customer/deletion-request', payload);
    return res.data;
  }
};

