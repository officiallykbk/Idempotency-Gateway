import dotenv from 'dotenv';
import { connectDB } from './utils/db';
import app from './app';
import { logger } from './utils/logger';
import mongoose from 'mongoose';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();

    process.on('SIGTERM', async () => {
      logger('SIGTERM received → disconnecting MongoDB');
      await mongoose.disconnect();
      process.exit(0);
    });
    
    app.listen(PORT, () => {
      logger(`[Server] Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger(`[Server] Error starting server`, error);
    process.exit(1);
  }
}

startServer();
