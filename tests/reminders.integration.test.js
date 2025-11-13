const request = require('supertest');
const app = require('../app');

describe('Reminders API (mock mode) - pagination and POST validation', () => {
  let server;
  beforeAll(() => {
    process.env.USE_MOCK_DB = 'true';
    server = app.listen(0);
  });
  afterAll(() => new Promise((res) => server.close(res)));

  test('GET /api/reminders with limit and offset', async () => {
    const res = await request(server).get('/api/reminders?limit=1&offset=1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // returned length should be <= requested limit
    expect(res.body.length).toBeLessThanOrEqual(1);
  });

  test('POST /api/reminders validation fails when missing fields', async () => {
    const res = await request(server)
      .post('/api/reminders')
      .send({ client_name: 'Test' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
