/**
 * Counter — atomic sequence generator for invoice numbers.
 * Keyed per business + financial year, e.g. "<businessId>:2024-25".
 * Using $inc in a single findOneAndUpdate guarantees no duplicate numbers under concurrency.
 */
import { Schema, model, models, type Model } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) || model<ICounter>("Counter", CounterSchema);

/** Atomically increment and return the next sequence value for a key. */
export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return doc!.seq;
}
