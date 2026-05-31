import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

// Load .env.local if process.env.MONGODB_URI is not set
if (!process.env.MONGODB_URI && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const index = trimmed.indexOf("=");
      if (index !== -1) {
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined. Please check .env.local.");
  process.exit(1);
}

const DEMO_EMAIL = "demo@billeasy.test";
const DEMO_PASSWORD = "demo123";

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGODB_URI, {
    dbName: process.env.MONGODB_DB || "billeasy",
  });
  console.log("✅ Connected to MongoDB.");

  // Define User Schema inline for simplicity
  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, select: false },
    businessIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Business" }],
  }, { collection: "users" });

  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  // Define Business Schema inline
  const BusinessSchema = new mongoose.Schema({
    name: String,
    gstin: String,
    stateCode: String,
  }, { collection: "businesses" });

  const Business = mongoose.models.Business || mongoose.model("Business", BusinessSchema);

  // Define Customer Schema
  const CustomerSchema = new mongoose.Schema({
    businessId: mongoose.Schema.Types.ObjectId,
    name: String,
  }, { collection: "customers" });

  const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

  // Define Item Schema
  const ItemSchema = new mongoose.Schema({
    businessId: mongoose.Schema.Types.ObjectId,
    name: String,
  }, { collection: "items" });

  const Item = mongoose.models.Item || mongoose.model("Item", ItemSchema);

  // Define Invoice Schema
  const InvoiceSchema = new mongoose.Schema({
    businessId: mongoose.Schema.Types.ObjectId,
    invoiceNo: String,
    status: String,
  }, { collection: "invoices" });

  const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);

  console.log(`Searching for demo user: ${DEMO_EMAIL}...`);
  const user = await User.findOne({ email: DEMO_EMAIL }).select("+passwordHash");
  if (!user) {
    console.error(`❌ User ${DEMO_EMAIL} not found. Please run "npm run seed" first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("✅ User found in DB.");
  console.log("Verifying password...");
  const isMatch = await bcrypt.compare(DEMO_PASSWORD, user.passwordHash);
  if (!isMatch) {
    console.error("❌ Password verification failed!");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("✅ Password verified successfully!");

  const businessId = user.businessIds[0];
  if (!businessId) {
    console.error("❌ No business associated with this user.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Fetching business data for ID: ${businessId}...`);
  const business = await Business.findById(businessId);
  if (!business) {
    console.error("❌ Business not found in DB.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✅ Business found: "${business.name}" (GSTIN: ${business.gstin}, State Code: ${business.stateCode})`);

  const [customerCount, itemCount, invoiceCount] = await Promise.all([
    Customer.countDocuments({ businessId }),
    Item.countDocuments({ businessId }),
    Invoice.countDocuments({ businessId }),
  ]);

  console.log("\n--- Database Stats for Business ---");
  console.log(`👥 Customers: ${customerCount}`);
  console.log(`📦 Items: ${itemCount}`);
  console.log(`📄 Invoices: ${invoiceCount}`);
  console.log("-----------------------------------\n");

  console.log("✅ E2E Login & DB Data Verification Success!");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Verification failed with error:", err);
  mongoose.disconnect();
  process.exit(1);
});
