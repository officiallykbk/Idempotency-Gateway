import request from 'supertest';
import app from '../app';
import { IdempotencyRecord } from '../model/idempotency.model';
import * as paymentService from '../services/payment.service';
import { hashBody } from '../utils/hasher';

jest.mock('../services/payment.service');
jest.mock('../utils/swagger', () => ({
  setupSwagger: jest.fn(),
}));
jest.mock('../model/idempotency.model', () => ({
  IdempotencyRecord: {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

const mockedSimulatePayment = paymentService.simulatePayment as jest.MockedFunction<typeof paymentService.simulatePayment>;
const mockedIdempotencyRecord = IdempotencyRecord as jest.Mocked<typeof IdempotencyRecord>;

const createMockRecord = (key = 'test-key') => ({
  key,
  requestHash: hashBody({ amount: 100, currency: 'GHS' }),
  status: 'PROCESSING',
  responseStatus: undefined as number | undefined,
  responseBody: undefined as unknown,
  save: jest.fn().mockResolvedValue(undefined),
});

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

describe('Payment Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIdempotencyRecord.findOne.mockResolvedValue(null);
    mockedIdempotencyRecord.deleteOne.mockResolvedValue({ deletedCount: 1 } as never);
  });

  it('should return 400 if Idempotency-Key header is missing', async () => {
    const res = await request(app)
      .post('/api/process-payment')
      .send({ amount: 100, currency: 'GHS' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Missing required header: Idempotency-Key' });
    expect(mockedIdempotencyRecord.findOne).not.toHaveBeenCalled();
  });

  it('should return 400 and delete the processing record if amount or currency is missing/invalid', async () => {
    const record = createMockRecord();
    mockedIdempotencyRecord.create.mockResolvedValue(record as never);

    const res = await request(app)
      .post('/api/process-payment')
      .set('Idempotency-Key', 'test-key')
      .send({ amount: 'invalid', currency: 'GHS' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Request body must include amount as number and currency as string.' });
    expect(mockedIdempotencyRecord.create).toHaveBeenCalledWith({
      key: 'test-key',
      requestHash: hashBody({ amount: 'invalid', currency: 'GHS' }),
      status: 'PROCESSING',
    });
    expect(mockedIdempotencyRecord.deleteOne).toHaveBeenCalledWith({ key: 'test-key' });
    expect(mockedSimulatePayment).not.toHaveBeenCalled();
  });

  it('should process a first valid payment request and save the completed response', async () => {
    const record = createMockRecord();
    const paymentResult = {
      message: 'Charged 100 GHS',
      transactionId: 'txn_test123',
      processedAt: '2026-06-16T12:00:00.000Z',
    };

    mockedIdempotencyRecord.create.mockResolvedValue(record as never);
    mockedSimulatePayment.mockResolvedValue(paymentResult);

    const res = await request(app)
      .post('/api/process-payment')
      .set('Idempotency-Key', 'test-key')
      .send({ amount: 100, currency: 'GHS' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(paymentResult);
    expect(mockedIdempotencyRecord.findOne).toHaveBeenCalledWith({ key: 'test-key' });
    expect(mockedIdempotencyRecord.create).toHaveBeenCalledWith({
      key: 'test-key',
      requestHash: hashBody({ amount: 100, currency: 'GHS' }),
      status: 'PROCESSING',
    });
    expect(mockedSimulatePayment).toHaveBeenCalledWith(100, 'GHS');
    expect(record.status).toBe('COMPLETED');
    expect(record.responseStatus).toBe(201);
    expect(record.responseBody).toEqual(paymentResult);
    expect(record.save).toHaveBeenCalledTimes(1);
  });

  it('should replay a completed payment response from the mocked DB', async () => {
    const cachedResponse = {
      message: 'Charged 100 GHS',
      transactionId: 'txn_cached123',
      processedAt: '2026-06-16T12:00:00.000Z',
    };

    mockedIdempotencyRecord.findOne.mockResolvedValue({
      key: 'test-key',
      requestHash: hashBody({ amount: 100, currency: 'GHS' }),
      status: 'COMPLETED',
      responseStatus: 201,
      responseBody: cachedResponse,
    } as never);

    const res = await request(app)
      .post('/api/process-payment')
      .set('Idempotency-Key', 'test-key')
      .send({ amount: 100, currency: 'GHS' });

    expect(res.status).toBe(201);
    expect(res.headers['x-cache-hit']).toBe('true');
    expect(res.body).toEqual(cachedResponse);
    expect(mockedIdempotencyRecord.create).not.toHaveBeenCalled();
    expect(mockedSimulatePayment).not.toHaveBeenCalled();
  });

  it('should return 422 when an idempotency key is reused with a different body', async () => {
    mockedIdempotencyRecord.findOne.mockResolvedValue({
      key: 'test-key',
      requestHash: hashBody({ amount: 100, currency: 'GHS' }),
      status: 'COMPLETED',
      responseStatus: 201,
      responseBody: { message: 'Charged 100 GHS' },
    } as never);

    const res = await request(app)
      .post('/api/process-payment')
      .set('Idempotency-Key', 'test-key')
      .send({ amount: 500, currency: 'GHS' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: 'Idempotency key already used for a different request body.',
    });
    expect(mockedIdempotencyRecord.create).not.toHaveBeenCalled();
    expect(mockedSimulatePayment).not.toHaveBeenCalled();
  });

  it('should return 500 if the idempotency model fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedIdempotencyRecord.findOne.mockRejectedValue(new Error('database unavailable'));

    const res = await request(app)
      .post('/api/process-payment')
      .set('Idempotency-Key', 'test-key')
      .send({ amount: 100, currency: 'GHS' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Idempotency check failed.' });
    expect(mockedIdempotencyRecord.create).not.toHaveBeenCalled();
    expect(mockedSimulatePayment).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
