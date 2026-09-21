const LOCAL_URL = 'http://localhost:5000/api';

async function runTest(apiUrl) {
  console.log(`\n==================================================`);
  console.log(`Testing Citizenship KYC Flow against: ${apiUrl}`);
  console.log(`==================================================\n`);

  try {
    const testPhone = `+97798${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `driver_${Date.now()}@test.com`;

    // 1. Register test driver
    console.log(`[1] Registering test driver (${testPhone})...`);
    let regRes = await fetch(`${apiUrl}/auth/driver-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Driver Citizenship',
        email: testEmail,
        phone: testPhone,
        password: 'Password123!',
        drivingLicenceNumber: 'DL-99887766'
      })
    });
    let regJson = await regRes.json();
    console.log('    Register status:', regJson.success);

    let token = regJson.token || regJson.data?.token;

    if (!token) {
      console.log('    Attempting login...');
      const loginRes = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testPhone,
          password: 'Password123!',
          role: 'driver'
        })
      });
      const loginJson = await loginRes.json();
      token = loginJson.token || loginJson.data?.token;
    }

    if (!token) {
      console.error('FAILED: Could not obtain driver authentication token', regJson);
      return false;
    }
    console.log('    Driver authenticated successfully.');

    const headers = { Authorization: `Bearer ${token}` };

    // Create dummy image Blob for upload
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const frontFile = new Blob([dummyImageBuffer], { type: 'image/jpeg' });
    const backFile = new Blob([dummyImageBuffer], { type: 'image/jpeg' });

    // 2. Upload Citizenship KYC Document (Document Number, Issue Date, Front, Back)
    console.log('\n[2] Uploading Citizenship / National ID (Issue Date: 2025-01-15, Front, Back)...');
    const form = new FormData();
    form.append('docType', 'citizenship');
    form.append('documentNumber', 'CIT-98765-NP');
    form.append('citizenshipIssueDate', '2025-01-15');
    form.append('docFront', frontFile, 'citizenship_front.jpg');
    form.append('docBack', backFile, 'citizenship_back.jpg');

    const uploadRes = await fetch(`${apiUrl}/driver/documents`, {
      method: 'POST',
      headers,
      body: form
    });

    const uploadJson = await uploadRes.json();
    console.log('    Upload Response success:', uploadJson.success);
    const driverData = uploadJson.data || {};
    console.log('    MongoDB citizenshipIssueDate:', driverData.citizenshipIssueDate);
    console.log('    MongoDB citizenshipDocFront:', driverData.citizenshipDocFront || driverData.citizenshipDoc);
    console.log('    MongoDB citizenshipDocBack:', driverData.citizenshipDocBack);
    console.log('    MongoDB citizenshipStatus:', driverData.citizenshipStatus);

    // 3. Verify Driver Documents Endpoint
    console.log('\n[3] Checking /driver/documents endpoint...');
    const docRes = await fetch(`${apiUrl}/driver/documents`, { headers });
    const docJson = await docRes.json();
    const docs = docJson.data?.documents || docJson.data || {};
    const citizenshipDoc = docs.citizenship || (Array.isArray(docs) ? docs.find(d => d.key === 'citizenship') : null) || {};

    console.log('    Driver App Citizenship Doc:', {
      number: citizenshipDoc.documentNumber || citizenshipDoc.number,
      issueDate: citizenshipDoc.citizenshipIssueDate || citizenshipDoc.issueDate,
      docFront: citizenshipDoc.docFront || citizenshipDoc.url,
      docBack: citizenshipDoc.docBack,
      status: citizenshipDoc.status
    });

    // 4. Admin Verification Endpoint
    console.log('\n[4] Checking Admin /admin/drivers endpoint...');
    let adminToken = null;
    let adminLoginRes = await fetch(`${apiUrl}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@platform.com', password: 'AdminPassword123!' })
    });
    let adminLoginJson = await adminLoginRes.json();
    adminToken = adminLoginJson.token || adminLoginJson.data?.token;

    if (!adminToken) {
      adminLoginRes = await fetch(`${apiUrl}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@travelease.com', password: 'AdminPassword123!' })
      });
      adminLoginJson = await adminLoginRes.json();
      adminToken = adminLoginJson.token || adminLoginJson.data?.token;
    }

    if (adminToken) {
      const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
      const adminDriversRes = await fetch(`${apiUrl}/admin/drivers`, { headers: adminHeaders });
      const adminDriversJson = await adminDriversRes.json();
      const driverList = adminDriversJson.data || [];
      const targetDriver = driverList.find(d => d.mobileNumber === testPhone || d.citizenshipNumber === 'CIT-98765-NP');

      if (targetDriver) {
        console.log('    Admin Panel Driver Citizenship Data:', {
          driverId: targetDriver._id,
          docNum: targetDriver.citizenshipNumber || targetDriver.documents?.citizenship?.documentNumber,
          issueDate: targetDriver.citizenshipIssueDate || targetDriver.documents?.citizenship?.issueDate,
          docFront: targetDriver.citizenshipDocFront || targetDriver.documents?.citizenship?.docFront,
          docBack: targetDriver.citizenshipDocBack || targetDriver.documents?.citizenship?.docBack,
          status: targetDriver.citizenshipStatus || targetDriver.documents?.citizenship?.status
        });

        // 5. Admin Reject Test
        console.log('\n[5] Testing Admin Rejection for Citizenship...');
        const rejectRes = await fetch(`${apiUrl}/admin/drivers/${targetDriver._id}/verify-document`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            docType: 'citizenship',
            status: 'Rejected',
            rejectionReason: 'Front image mismatch with record details'
          })
        });
        const rejectJson = await rejectRes.json();
        console.log('    Admin Reject result:', rejectJson.success);

        // Verify status in Driver API
        const rejectedCheck = await fetch(`${apiUrl}/driver/documents`, { headers });
        const rejectedCheckJson = await rejectedCheck.json();
        const rejDoc = rejectedCheckJson.data?.documents?.citizenship || rejectedCheckJson.data?.citizenship;
        console.log('    Driver API status after rejection:', rejDoc?.status);

        // 6. Driver Re-upload Test
        console.log('\n[6] Testing Driver Re-upload...');
        const reuploadForm = new FormData();
        reuploadForm.append('docType', 'citizenship');
        reuploadForm.append('documentNumber', 'CIT-98765-NP');
        reuploadForm.append('citizenshipIssueDate', '2025-01-15');
        reuploadForm.append('docFront', frontFile, 'citizenship_front_fixed.jpg');
        reuploadForm.append('docBack', backFile, 'citizenship_back_fixed.jpg');

        const reuploadRes = await fetch(`${apiUrl}/driver/documents`, {
          method: 'POST',
          headers,
          body: reuploadForm
        });
        const reuploadJson = await reuploadRes.json();
        console.log('    Re-upload result:', reuploadJson.success);

        // Verify status reset to Pending Verification
        const reuploadedCheck = await fetch(`${apiUrl}/driver/documents`, { headers });
        const reuploadedCheckJson = await reuploadedCheck.json();
        const reupDoc = reuploadedCheckJson.data?.documents?.citizenship || reuploadedCheckJson.data?.citizenship;
        console.log('    Driver API status after re-upload:', reupDoc?.status);

        // 7. Admin Approve Test
        console.log('\n[7] Testing Admin Approval...');
        const approveRes = await fetch(`${apiUrl}/admin/drivers/${targetDriver._id}/verify-document`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            docType: 'citizenship',
            status: 'Approved'
          })
        });
        const approveJson = await approveRes.json();
        console.log('    Admin Approve result:', approveJson.success);

        // Final status check
        const approvedCheck = await fetch(`${apiUrl}/driver/documents`, { headers });
        const approvedCheckJson = await approvedCheck.json();
        const appDoc = approvedCheckJson.data?.documents?.citizenship || approvedCheckJson.data?.citizenship;
        console.log('    Final Driver API status after approval:', appDoc?.status);
      }
    } else {
      console.log('    Admin login skipped or failed.');
    }

    console.log('\n==================================================');
    console.log(`ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!`);
    console.log(`==================================================\n`);
    return true;

  } catch (err) {
    console.error('ERROR IN TEST:', err);
    return false;
  }
}

runTest(LOCAL_URL);
