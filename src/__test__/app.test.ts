import request from 'supertest';
import app from '../app';

describe('Health Check Endpoints', () => {
  it('should return 200 and a welcome message for /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Welcome to Idempotency-Gateway' });
  });

  it('should return 200 and a server is running message for /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Server is running' });
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
  });
});
