import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
};
