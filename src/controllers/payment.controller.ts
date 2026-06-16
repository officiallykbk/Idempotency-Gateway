import { Request, Response } from "express";
import { simulatePayment } from "../services/payment.service";
import { IdempotencyRecord } from "../model/idempotency.model";
import {catchAsync} from "../utils/catchAsync";


export const PaymentController = catchAsync(async (req: Request, res: Response) => {

  const { amount, currency } = req.body;
    const record = res.locals.idempotencyRecord;

    if (typeof amount !== "number" || typeof currency !== "string") {
      await IdempotencyRecord.deleteOne({ key: record.key });

      return res.status(400).json({
      error: "Request body must include amount as number and currency as string."
    });
  }

  try {
    const paymentResult = await simulatePayment(amount, currency);

    record.status = "COMPLETED";
    record.responseStatus = 201;
    record.responseBody = paymentResult;

    await record.save();

    return res.status(201).json(paymentResult);
  } catch (error) {
    await IdempotencyRecord.deleteOne({ key: record.key });

    return res.status(500).json({
      error: "Payment processing failed. Please retry."
    });
  }
});