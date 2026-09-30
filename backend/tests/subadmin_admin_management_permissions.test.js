const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');

describe('Permission-gated Sub-Admin Management', () => {
  let superAdmin;
  let systemAdmin;
  let driverAdmin;
  let targetSubAdmin;
  let superAdminToken;
  let systemAdminToken;
  let driverAdminToken;
  let targetToken;
  let phoneSequence = 0;

  const makeToken = user => jwt.sign(
    { id: user._id, role: user.role, permissionsVersion: user.permissionsVersion || 1 },
    jwtConfig.secret,
    { expiresIn: '1h' }
  );

  beforeAll(async () => {
    await connectTestDB();
    const suffix = Date.now();
    const createUser = (name, role, permissions = []) => User.create({
      name,
      email: `${name.toLowerCase().replace(/ /g, '-')}-${suffix}@example.com`,
      phone: `+1${suffix}${phoneSequence++}`,
      password: 'TestPassword123',
      role,
      permissions,
      status: 'Active'
    });

    superAdmin = await createUser('Management Super Admin', 'admin');
    systemAdmin = await createUser('Management System Admin', 'sub_admin', [
      'admin.view', 'admin.create', 'admin.edit', 'admin.deactivate', 'admin.permissions'
    ]);
    driverAdmin = await createUser('Management Driver Admin', 'sub_admin', ['driver.view']);
    targetSubAdmin = await createUser('Management Target', 'sub_admin', ['customer.view']);
    superAdminToken = makeToken(superAdmin);
    systemAdminToken = makeToken(systemAdmin);
    driverAdminToken = makeToken(driverAdmin);
    targetToken = makeToken(targetSubAdmin);
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: [superAdmin?._id, systemAdmin?._id, driverAdmin?._id, targetSubAdmin?._id].filter(Boolean) } });
    await closeTestDB();
  });

  test('admin.view grants listing and templates; unrelated module permissions do not', async () => {
    const allowed = await request(app)
      .get('/api/admin/subadmins')
      .set('Authorization', `Bearer ${systemAdminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.every(user => !Object.prototype.hasOwnProperty.call(user, 'password'))).toBe(true);

    const templates = await request(app)
      .get('/api/admin/subadmins/permission-templates')
      .set('Authorization', `Bearer ${systemAdminToken}`);
    expect(templates.status).toBe(200);

    const denied = await request(app)
      .get('/api/admin/subadmins')
      .set('Authorization', `Bearer ${driverAdminToken}`);
    expect(denied.status).toBe(403);
    expect(denied.body.message).toContain('admin.view');
  });

  test('admin.create retains only the explicitly supplied known permissions and hashes password', async () => {
    const password = 'NewSystemSubAdmin123';
    const response = await request(app)
      .post('/api/admin/subadmins')
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({
        name: 'Created System Sub-Admin',
        email: `created-system-${Date.now()}@example.com`,
        phone: `+1${Date.now()}${phoneSequence++}`,
        password,
        adminType: 'custom',
        permissions: ['admin.view', 'admin.create', 'driver.view', '*', 'full_access']
      });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe('sub_admin');
    expect(response.body.data.permissions).toEqual(['admin.view', 'admin.create', 'driver.view']);
    expect(response.body).not.toHaveProperty('password');
    expect(response.body.data).not.toHaveProperty('password');

    const created = await User.findById(response.body.data._id).select('+password');
    expect(created.password).not.toBe(password);
    expect(await created.matchPassword(password)).toBe(true);
    await User.findByIdAndDelete(created._id);

    const denied = await request(app)
      .post('/api/admin/subadmins')
      .set('Authorization', `Bearer ${driverAdminToken}`)
      .send({
        name: 'Unauthorized Created Admin',
        email: `denied-created-${Date.now()}@example.com`,
        password,
        adminType: 'custom',
        permissions: ['driver.view']
      });
    expect(denied.status).toBe(403);
    expect(denied.body.message).toContain('admin.create');
  });

  test('admin.edit and admin.permissions are independently enforced', async () => {
    const profileUpdate = await request(app)
      .patch(`/api/admin/subadmins/${targetSubAdmin._id}`)
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({ name: 'Updated Management Target' });
    expect(profileUpdate.status).toBe(200);

    const permissionsUpdate = await request(app)
      .patch(`/api/admin/subadmins/${targetSubAdmin._id}/permissions`)
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({ adminType: 'custom', permissions: ['customer.view', 'admin.view'] });
    expect(permissionsUpdate.status).toBe(200);
    expect(permissionsUpdate.body.data.permissions).toEqual(['customer.view', 'admin.view']);
    expect(permissionsUpdate.body.data.role).toBe('sub_admin');

    targetToken = makeToken(await User.findById(targetSubAdmin._id));
    const denied = await request(app)
      .patch(`/api/admin/subadmins/${targetSubAdmin._id}/permissions`)
      .set('Authorization', `Bearer ${targetToken}`)
      .send({ adminType: 'custom', permissions: ['driver.view'] });
    expect(denied.status).toBe(403);
    expect(denied.body.message).toContain('admin.permissions');
  });

  test('Super Admin role keeps existing access regardless of permission arrays', async () => {
    const response = await request(app)
      .get('/api/admin/subadmins')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(response.status).toBe(200);
  });
});
