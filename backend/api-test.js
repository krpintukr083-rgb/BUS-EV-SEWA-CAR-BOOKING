const axios = require('axios');
const login = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', { identifier: 'admin@platform.com', password: 'admin123', role: 'admin' });
    const token = res.data.token;
    const custRes = await axios.get('http://localhost:5000/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } });
    const testCust = custRes.data.data.find(c => c.email === 'testdelete@example.com');
    if(!testCust) { console.log('Test customer not found'); return; }
    console.log('Found test customer:', testCust.id);
    const delRes = await axios.delete(`http://localhost:5000/api/admin/customers/${testCust.id}`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Delete response:', delRes.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
};
login();
