const fs = require('fs');
const filePath = 'E:/Bus-booking project/BUS-EV-SEWA-CAR-BOOKING/admin-panel/src/services/adminService.js';
let content = fs.readFileSync(filePath, 'utf8');

const serviceMethods = `
  // Platform Charge Settings & Reports
  getPlatformChargeSettings: async () => {
    const res = await api.get('/admin/platform-charge/settings');
    return res.data;
  },

  updatePlatformChargeSettings: async (data) => {
    const res = await api.put('/admin/platform-charge/settings', data);
    return res.data;
  },

  getPlatformChargeReport: async (params = {}) => {
    const res = await api.get('/admin/platform-charge/reports', { params });
    return res.data;
  },
`;

if (!content.includes('getPlatformChargeSettings')) {
  content = content.replace('// 16. Basic Reports', serviceMethods + '\n  // 16. Basic Reports');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('adminService.js updated with platform charge API methods');
} else {
  console.log('Already present in adminService.js');
}
