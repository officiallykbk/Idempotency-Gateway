import { Router } from "express";
import idempotencyMiddleware from "../middleware/idempotency";
import {PaymentController} from "../controllers/payment.controller";

const router = Router();

router.post("/process-payment", idempotencyMiddleware, PaymentController);

export default router;