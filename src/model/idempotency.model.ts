import mongoose from "mongoose";
import { KEY_TTL_SECONDS } from "../utils/constants";

const idempotencySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },

  requestHash: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["PROCESSING", "COMPLETED"],
    required: true
  },

  responseStatus: {
    type: Number
  },

  responseBody: {
    type: Object
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: KEY_TTL_SECONDS
  }
});

export const IdempotencyRecord = mongoose.model(
  "IdempotencyRecord",
  idempotencySchema
);