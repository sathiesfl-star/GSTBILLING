// Removes throwaway test accounts (prospect-test-*@example.com) and their businesses from the DB.
import mongoose from "mongoose";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "billeasy" });
  const db = mongoose.connection.db;

  const testUsers = await db.collection("users").find({ email: /^prospect-test-.*@example\.com$/ }).toArray();
  console.log("Test users found:", testUsers.length);

  for (const u of testUsers) {
    const businesses = await db.collection("businesses").find({ ownerUserId: u._id }).toArray();
    for (const b of businesses) {
      await db.collection("invoices").deleteMany({ businessId: b._id });
      await db.collection("customers").deleteMany({ businessId: b._id });
      await db.collection("items").deleteMany({ businessId: b._id });
      await db.collection("businesses").deleteOne({ _id: b._id });
    }
    await db.collection("users").deleteOne({ _id: u._id });
    console.log("  removed:", u.email);
  }

  console.log("Remaining users:", await db.collection("users").countDocuments());
  await mongoose.disconnect();
}
main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
