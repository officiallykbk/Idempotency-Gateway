import { hashBody } from "../utils/hasher";
import { IdempotencyRecord } from "../model/idempotency.model";
import { WAIT_INTERVAL_MS, WAIT_TIMEOUT_MS } from "../utils/constants";
import {Request, Response, NextFunction} from "express";
import delay from "../utils/delay";


async function waitForCompletedRecord(key:any) {
  const startTime = Date.now();

  while (Date.now() - startTime < WAIT_TIMEOUT_MS) {
    const record = await IdempotencyRecord.findOne({ key });

    if (!record) {
      return null;
    }

    if (record.status === "COMPLETED") {
      return record;
    }

    await delay(WAIT_INTERVAL_MS);
  }

  return null;
}


export default async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.header("Idempotency-Key");

  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Missing required header: Idempotency-Key"
    });
  }

  const requestHash = hashBody(req.body);

  try {
    let record = await IdempotencyRecord.findOne({
      key: idempotencyKey
    });

    if (record) {
      if (record.requestHash !== requestHash) {
        return res.status(422).json({
          error: "Idempotency key already used for a different request body."
        });
      }

      if (record.status === "COMPLETED") {
        return res
          .status(record.responseStatus!)
          .set("Idempotency-Key-Used", "true")
          .json(record.responseBody);
      }

      if (record.status === "PROCESSING") {
        const completedRecord = await waitForCompletedRecord(idempotencyKey);

        if (!completedRecord) {
          return res.status(409).json({
            error: "Payment is still processing. Please retry shortly."
          });
        }

        return res
          .status(completedRecord.responseStatus!)
          .set("Idempotency-Key-Used", "true")
          .json(completedRecord.responseBody);
      }
    }

    try {
      record = await IdempotencyRecord.create({
        key: idempotencyKey,
        requestHash,
        status: "PROCESSING"
      });
    } catch (error: any) {
      if (error.code === 11000) {
        const completedRecord = await waitForCompletedRecord(idempotencyKey);

        if (!completedRecord) {
          return res.status(409).json({
            error: "Payment is still processing. Please retry shortly."
          });
        }

        return res
          .status(completedRecord.responseStatus!)
          .set("Idempotency-Key-Used", "true")
          .json(completedRecord.responseBody);
      }

      throw error;
    }

    res.locals.idempotencyRecord = record;
    next();
  } catch (error) {
    console.error("Idempotency error:", error);

    return res.status(500).json({
      error: "Idempotency check failed."
    });
  }
}

