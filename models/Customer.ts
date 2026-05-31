/** Customer — a buyer belonging to a Business. Money stored as integer paise. */
import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ICustomer {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  gstin?: string; // absent => B2C
  stateCode: string;
  address?: { line1?: string; city?: string; pincode?: string };
  phone?: string;
  email?: string;
  outstandingPaise: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true },
    gstin: { type: String, uppercase: true, trim: true },
    stateCode: { type: String, required: true },
    address: {
      line1: String,
      city: String,
      pincode: String,
    },
    phone: String,
    email: String,
    outstandingPaise: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Per-tenant lookups + name search
CustomerSchema.index({ businessId: 1, name: 1 });
CustomerSchema.index({ businessId: 1, name: "text" });

export const Customer: Model<ICustomer> =
  (models.Customer as Model<ICustomer>) || model<ICustomer>("Customer", CustomerSchema);
