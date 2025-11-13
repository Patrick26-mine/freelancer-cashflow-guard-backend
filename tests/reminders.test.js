const request = require('supertest');
const app = require('../app');

describe('Reminders API (mock mode)', () => {
  let server;
  beforeAll(() => {
    process.env.USE_MOCK_DB = 'true';
    server = app.listen(0);
  });
  afterAll(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  test('GET /api/reminders returns mock reminders array', async () => {
    const res = await request(server).get('/api/reminders');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const first = res.body[0];
    expect(first).toHaveProperty('reminder_id');
    expect(first).toHaveProperty('client_name');
    expect(first).toHaveProperty('client_email');
  });

  test('GET /api/reminders supports limit and offset', async () => {
    const res = await request(server).get('/api/reminders?limit=1&offset=1');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  test('POST /api/reminders validation rejects missing fields', async () => {
    const res = await request(server).post('/api/reminders').send({ client_name: 'Foo' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('POST /api/reminders accepts valid payload', async () => {
    const payload = {
      invoice_id: 123,
      client_name: 'ACME',
      email: 'test@example.com',
    };
    const res = await request(server).post('/api/reminders').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('reminder_id');
    expect(res.body.client_name).toBe(payload.client_name);
    expect(res.body.client_email).toBe(payload.email);
  });
});
