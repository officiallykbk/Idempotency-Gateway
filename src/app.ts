import express, { NextFunction, type Application, type Request, type Response } from 'express';
import { globalErrorHandler } from './middleware/globalerrorHandler';
import cors from 'cors';
import createHttpError from 'http-errors';
import { setupSwagger } from './utils/swagger';
import routes from './routes/payment.route';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Api Documentation
setupSwagger(app);  

/* Health check route*/
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to Idempotency-Gateway' });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Server is running' });
});

/**  Routes*/ 
app.use('/api', routes);

/* Graceful Error handling*/
app.use((req: Request, res: Response, next: NextFunction) =>
  next(createHttpError(404, `Can't find ${req.originalUrl} on this server`)),
);
app.use(globalErrorHandler);

export default app;
