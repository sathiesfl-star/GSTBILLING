/** Item — a product/service in a Business's catalogue. defaultRatePaise is integer paise. */
import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IItem {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  hsnSac: string;
  unit: string;
  defaultRatePaise: number;
  gstRate: number; // 0 | 5 | 12 | 18 | 28
  cessRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true },
    hsnSac: { type: String, required: true },
    unit: { type: String, default: "pcs" },
    defaultRatePaise: { type: Number, default: 0 },
    gstRate: { type: Number, enum: [0, 5, 12, 18, 28], default: 18 },
    cessRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ItemSchema.index({ businessId: 1, name: 1 });
ItemSchema.index({ businessId: 1, name: "text" });

export const Item: Model<IItem> =
  (models.Item as Model<IItem>) || model<IItem>("Item", ItemSchema);
