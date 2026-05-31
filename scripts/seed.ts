/**
 * Seed the database with the prototype's mock data, owned by a demo user.
 * Run: npm run seed   (loads .env.local, connects to Atlas, wipes+reseeds the demo business)
 *
 * Demo login after seeding:  demo@billeasy.test  /  demo123
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../lib/mongodb";
import { User } from "../models/User";
import { Business } from "../models/Business";
import { Customer } from "../models/Customer";
import { Item } from "../models/Item";
import { Invoice, type InvoiceStatus } from "../models/Invoice";
import { Counter } from "../models/Counter";
import { SELLER, CUSTOMERS, ITEMS, INVOICES } from "../lib/mock-data";

const DEMO_EMAIL = "demo@billeasy.test";
const DEMO_PASSWORD = "demo123";

function mapStatus(s: string): InvoiceStatus {
  if (s === "overdue") return "sent"; // model has no "overdue"; treat as sent/unpaid
  if (s === "paid") return "paid";
  if (s === "draft") return "draft";
  return "sent";
}

async function main() {
  await connectToDatabase();
  console.log("Connected. Seeding…");

  // 1) Demo user
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({ name: "Demo User", email: DEMO_EMAIL, passwordHash, provider: "credentials" });
  } else {
    user.passwordHash = passwordHash;
    await user.save();
  }

  // 2) Business (from SELLER) — wipe any previous demo business + its data
  const prev = await Business.findOne({ ownerUserId: user._id });
  if (prev) {
    await Promise.all([
      Invoice.deleteMany({ businessId: prev._id }),
      Customer.deleteMany({ businessId: prev._id }),
      Item.deleteMany({ businessId: prev._id }),
      Counter.deleteMany({ _id: new RegExp(`^${prev._id.toString()}:`) }),
    ]);
    await Business.deleteOne({ _id: prev._id });
  }

  const business = await Business.create({
    ownerUserId: user._id,
    name: SELLER.name,
    gstin: SELLER.gstin,
    stateCode: SELLER.stateCode,
    address: { line1: SELLER.address, city: SELLER.city, pincode: SELLER.pincode },
    phone: SELLER.phone,
    email: SELLER.email,
    bankDetails: SELLER.bank,
    financialYear: "2024-25",
    plan: "pro",
    eInvoiceEnabled: true,
  });
  user.businessIds = [business._id];
  await user.save();

  // 3) Customers — keep a map from mock id -> real _id
  const custMap = new Map<string, mongoose.Types.ObjectId>();
  for (const c of CUSTOMERS) {
    const doc = await Customer.create({
      businessId: business._id,
      name: c.name,
      gstin: c.gstin,
      stateCode: c.stateCode,
      address: { line1: c.address, city: c.city, pincode: c.pincode },
      phone: c.phone,
      email: c.email,
    });
    custMap.set(c.id, doc._id);
  }

  // 4) Items
  for (const it of ITEMS) {
    await Item.create({
      businessId: business._id,
      name: it.name,
      hsnSac: it.hsnSac,
      unit: it.unit,
      defaultRatePaise: it.defaultRatePaise,
      gstRate: it.gstRate,
    });
  }

  // 5) Invoices (totals already computed by the GST engine in mock-data)
  for (const inv of INVOICES) {
    const cust = CUSTOMERS.find((c) => c.id === inv.customerId)!;
    await Invoice.create({
      businessId: business._id,
      invoiceNo: inv.invoiceNo,
      invoiceDate: new Date(inv.isoDate),
      customerId: custMap.get(inv.customerId),
      customerSnapshot: {
        name: cust.name,
        gstin: cust.gstin,
        stateCode: cust.stateCode,
        address: cust.address,
        phone: cust.phone,
        email: cust.email,
      },
      placeOfSupplyStateCode: cust.stateCode,
      taxType: inv.taxType,
      lineItems: inv.totals.lines.map((l) => ({
        description: l.description,
        hsnSac: l.hsnSac,
        qty: l.qty,
        unit: l.unit,
        ratePaise: l.ratePaise,
        gstRate: l.gstRate,
        cessRate: 0,
        taxablePaise: l.taxablePaise,
        cgstPaise: l.cgstPaise,
        sgstPaise: l.sgstPaise,
        igstPaise: l.igstPaise,
        cessPaise: 0,
        totalPaise: l.totalPaise,
      })),
      subtotalPaise: inv.totals.subtotalPaise,
      totalCgstPaise: inv.totals.totalCgstPaise,
      totalSgstPaise: inv.totals.totalSgstPaise,
      totalIgstPaise: inv.totals.totalIgstPaise,
      totalCessPaise: 0,
      roundOffPaise: inv.totals.roundOffPaise,
      grandTotalPaise: inv.totals.grandTotalPaise,
      amountInWords: inv.totals.amountInWords,
      status: mapStatus(inv.status),
      einvoice: { status: inv.eInvoice ? "generated" : "none" },
      ewaybill: {},
      whatsappSentAt: inv.whatsappSent ? new Date(inv.isoDate) : undefined,
      finalizedAt: inv.status !== "draft" ? new Date(inv.isoDate) : undefined,
    });
  }

  // 6) Counter so the next invoice continues from INV-2425-0007
  await Counter.findByIdAndUpdate(
    `${business._id.toString()}:2024-25`,
    { $set: { seq: INVOICES.length } },
    { upsert: true }
  );

  console.log(`✅ Seeded: 1 business, ${CUSTOMERS.length} customers, ${ITEMS.length} items, ${INVOICES.length} invoices.`);
  console.log(`   Login → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
