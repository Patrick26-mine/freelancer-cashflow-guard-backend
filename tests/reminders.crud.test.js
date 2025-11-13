const request = require('supertest');
const app = require('../app');
const { v4: uuidv4 } = require('uuid');

describe('Reminders CRUD (mock mode)', () => {
  let server;
  beforeAll(() => {
    process.env.USE_MOCK_DB = 'true';
    server = app.listen(0);
  });
  afterAll(() => new Promise((res) => server.close(res)));
  let createdId;

  test('POST /api/reminders creates a reminder and returns UUID', async () => {
    const payload = { invoice_id: uuidv4(), client_name: 'Test User', email: 'test@example.com' };
    const res = await request(server).post('/api/reminders').send(payload).set('Content-Type', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('reminder_id');
    createdId = res.body.reminder_id;
  });

  test('GET /api/reminders/:id returns created reminder', async () => {
    const res = await request(server).get(`/api/reminders/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reminder_id', createdId);
  });

  test('PUT /api/reminders/:id updates created reminder', async () => {
    const res = await request(server).put(`/api/reminders/${createdId}`).send({ client_name: 'Updated' }).set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reminder_id', createdId);
    expect(res.body.client_name).toBe('Updated');
  });

  test('DELETE /api/reminders/:id returns 204', async () => {
    const res = await request(server).delete(`/api/reminders/${createdId}`);
    expect(res.status).toBe(204);
  });
});
