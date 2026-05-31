/** User — auth identity (NextAuth credentials + Google). Linked to one or more businesses. */
import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  name?: string;
  email: string;
  passwordHash?: string; // only for credentials provider
  image?: string;
  provider: "credentials" | "google";
  businessIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: String,
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false }, // never returned by default
    image: String,
    provider: { type: String, enum: ["credentials", "google"], default: "credentials" },
    businessIds: [{ type: Schema.Types.ObjectId, ref: "Business" }],
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);
