/** Business — the tenant. Every Customer/Item/Invoice belongs to one Business. */
import { Schema, model, models, type Model, type Types } from "mongoose";

export type PlanTier = "free" | "starter" | "pro" | "business";

export interface IAddress {
  line1?: string;
  line2?: string;
  city?: string;
  pincode?: string;
}

export interface IBankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface IBusiness {
  _id: Types.ObjectId;
  ownerUserId: Types.ObjectId;
  name: string;
  gstin: string;
  stateCode: string;
  address: IAddress;
  phone: string;
  email: string;
  logoUrl?: string;
  bankDetails?: IBankDetails;
  financialYear: string; // e.g. "2024-25"
  plan: PlanTier;
  planStatus?: "trialing" | "active" | "cancelled" | "expired";
  planExpiry?: Date;
  trialEndsAt?: Date;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  eInvoiceEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    line1: String,
    line2: String,
    city: String,
    pincode: String,
  },
  { _id: false }
);

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    accountName: String,
    accountNumber: String,
    ifsc: String,
    bankName: String,
  },
  { _id: false }
);

const BusinessSchema = new Schema<IBusiness>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    gstin: { type: String, required: true, uppercase: true, trim: true },
    stateCode: { type: String, required: true },
    address: { type: AddressSchema, default: {} },
    phone: String,
    email: String,
    logoUrl: String,
    bankDetails: BankDetailsSchema,
    financialYear: { type: String, required: true },
    plan: { type: String, enum: ["free", "starter", "pro", "business"], default: "free" },
    planStatus: { type: String, enum: ["trialing", "active", "cancelled", "expired"] },
    planExpiry: Date,
    trialEndsAt: Date,
    razorpaySubscriptionId: String,
    razorpayCustomerId: String,
    eInvoiceEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Business: Model<IBusiness> =
  (models.Business as Model<IBusiness>) || model<IBusiness>("Business", BusinessSchema);
