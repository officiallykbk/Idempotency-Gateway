import * as crypto from "crypto";
import delay from "../utils/delay";



export async function simulatePayment(amount: number, currency: string) {
  const randomDelay =  Math.floor(Math.random() * 2500) + 500;
  await delay(randomDelay);

  return {
    message: `Charged ${amount} ${currency}`,
    transactionId: `txn_${crypto.randomBytes(6).toString("hex")}`,
    processedAt: new Date().toISOString()
  };
}

