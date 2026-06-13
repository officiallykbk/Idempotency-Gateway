import { Request, Response, NextFunction, RequestHandler } from "express";

export const catchAsync = <T = any>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>): RequestHandler => {    
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
