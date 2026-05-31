/**
 * Invoice — the core document. ALL money is integer paise.
 *
 * GST discipline:
 *  - A finalized invoice is immutable. To correct it, issue a credit/debit note —
 *    never hard-edit. `finalizedAt` + `status` enforce this at the app layer.
 *  - `customerSnapshot` denormalizes the buyer so the invoice never changes if the
 *    customer record is later edited.
 *  - Invoice numbers come from the atomic Counter (see models/Counter.ts).
 */
import { Schema, model, models, type Model, type Types } from "mongoose";

export type TaxType = "intrastate" | "interstate" | "b2c";
export type InvoiceStatus = "draft" | "finalized" | "sent" | "paid" | "cancelled";

export interface IInvoiceLine {
  itemId?: Types.ObjectId;
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  ratePaise: number;
  gstRate: number;
  cessRate: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  totalPaise: number;
}

export interface ICustomerSnapshot {
  name: string;
  gstin?: string;
  stateCode: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface IEInvoice {
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  signedQrCode?: string;
  status: "none" | "generated" | "cancelled";
}

export interface IEWayBill {
  ewbNo?: string;
  validUpto?: Date;
}

export interface IInvoice {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  invoiceNo: string;
  invoiceDate: Date;
  dueDate?: Date;
  customerId?: Types.ObjectId;
  customerSnapshot: ICustomerSnapshot;
  placeOfSupplyStateCode: string;
  taxType: TaxType;
  lineItems: IInvoiceLine[];
  subtotalPaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  totalCessPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  amountInWords: string;
  status: InvoiceStatus;
  paymentTerms?: string;
  notes?: string;
  einvoice: IEInvoice;
  ewaybill: IEWayBill;
  whatsappSentAt?: Date;
  paymentLinkUrl?: string;
  razorpayPaymentId?: string;
  finalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LineSchema = new Schema<IInvoiceLine>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item" },
    description: { type: String, required: true },
    hsnSac: { type: String, default: "" },
    qty: { type: Number, required: true },
    unit: { type: String, default: "pcs" },
    ratePaise: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    cessRate: { type: Number, default: 0 },
    taxablePaise: { type: Number, required: true },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    cessPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    invoiceNo: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    dueDate: Date,
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: {
      name: { type: String, required: true },
      gstin: String,
      stateCode: { type: String, required: true },
      address: String,
      phone: String,
      email: String,
    },
    placeOfSupplyStateCode: { type: String, required: true },
    taxType: { type: String, enum: ["intrastate", "interstate", "b2c"], required: true },
    lineItems: { type: [LineSchema], default: [] },
    subtotalPaise: { type: Number, default: 0 },
    totalCgstPaise: { type: Number, default: 0 },
    totalSgstPaise: { type: Number, default: 0 },
    totalIgstPaise: { type: Number, default: 0 },
    totalCessPaise: { type: Number, default: 0 },
    roundOffPaise: { type: Number, default: 0 },
    grandTotalPaise: { type: Number, default: 0 },
    amountInWords: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "finalized", "sent", "paid", "cancelled"],
      default: "draft",
    },
    paymentTerms: String,
    notes: String,
    einvoice: {
      irn: String,
      ackNo: String,
      ackDate: String,
      signedQrCode: String,
      status: { type: String, enum: ["none", "generated", "cancelled"], default: "none" },
    },
    ewaybill: {
      ewbNo: String,
      validUpto: Date,
    },
    whatsappSentAt: Date,
    paymentLinkUrl: String,
    razorpayPaymentId: String,
    finalizedAt: Date,
  },
  { timestamps: true }
);

// Indexes from the plan: per-tenant listing, unique invoice number, status filtering.
InvoiceSchema.index({ businessId: 1, invoiceDate: -1 });
InvoiceSchema.index({ businessId: 1, invoiceNo: 1 }, { unique: true });
InvoiceSchema.index({ businessId: 1, status: 1 });

export const Invoice: Model<IInvoice> =
  (models.Invoice as Model<IInvoice>) || model<IInvoice>("Invoice", InvoiceSchema);
