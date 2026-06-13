import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment');
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(connectionString);
    logger(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger(`Error: ${error.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger('SIGTERM received → disconnecting MongoDB');
  await mongoose.disconnect();
  process.exit(0);
});
