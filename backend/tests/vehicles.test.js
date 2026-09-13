const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const Vehicle = require('../src/models/Vehicle');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('2. Vehicle Listing, Filter Consistency & Details API Tests', () => {
  let sampleBusId = '';

  test('GET /api/vehicles - Retrieve all active vehicles', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Verify all returned vehicles are Active
    res.body.data.forEach((v) => {
      expect(v.vehicleStatus).toBe('Active');
    });
  });

  test('GET /api/vehicles?type=bus & ?type=Bus & ?type=BUS - Case-insensitive Bus filtering', async () => {
    const resLower = await request(app).get('/api/vehicles?type=bus');
    const resCapital = await request(app).get('/api/vehicles?type=Bus');
    const resUpper = await request(app).get('/api/vehicles?type=BUS');

    expect(resLower.status).toBe(200);
    expect(resCapital.status).toBe(200);
    expect(resUpper.status).toBe(200);

    expect(resLower.body.data.length).toBeGreaterThan(0);
    expect(resLower.body.data.length).toBe(resCapital.body.data.length);
    expect(resLower.body.data.length).toBe(resUpper.body.data.length);

    resLower.body.data.forEach((v) => {
      expect(v.vehicleType).toBe('Bus');
      expect(v.vehicleStatus).toBe('Active');
    });

    sampleBusId = resLower.body.data[0]._id;
  });

  test('GET /api/vehicles?type=ev-sewa & ?type=EV-Sewa - Case-insensitive EV-Sewa filtering', async () => {
    const resLower = await request(app).get('/api/vehicles?type=ev-sewa');
    const resHyphen = await request(app).get('/api/vehicles?type=EV-Sewa');

    expect(resLower.status).toBe(200);
    expect(resHyphen.status).toBe(200);
    expect(resLower.body.data.length).toBeGreaterThan(0);
    expect(resLower.body.data.length).toBe(resHyphen.body.data.length);

    resLower.body.data.forEach((v) => {
      expect(v.vehicleType).toBe('EV-Sewa');
      expect(v.vehicleStatus).toBe('Active');
    });
  });

  test('GET /api/vehicles?type=car & ?type=Car & ?type=CAR - Case-insensitive Car filtering', async () => {
    const resLower = await request(app).get('/api/vehicles?type=car');
    const resCapital = await request(app).get('/api/vehicles?type=Car');

    expect(resLower.status).toBe(200);
    expect(resCapital.status).toBe(200);
    expect(resLower.body.data.length).toBeGreaterThan(0);
    expect(resLower.body.data.length).toBe(resCapital.body.data.length);

    resLower.body.data.forEach((v) => {
      expect(v.vehicleType).toBe('Car');
      expect(v.vehicleStatus).toBe('Active');
    });
  });

  test('Verify Inactive and Blocked vehicles are never returned in /api/vehicles', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);

    const statuses = res.body.data.map((v) => v.vehicleStatus);
    expect(statuses).not.toContain('Inactive');
    expect(statuses).not.toContain('Blocked');
  });

  test('GET /api/vehicles/:id - Retrieve single vehicle details with booked seats', async () => {
    const res = await request(app).get(`/api/vehicles/${sampleBusId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(sampleBusId.toString());
    expect(Array.isArray(res.body.data.bookedSeats)).toBe(true);
  });

  test('GET /api/vehicles/:id - Return 404 for non-existent vehicle ID', async () => {
    const res = await request(app).get('/api/vehicles/65f000000000000000000000');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
