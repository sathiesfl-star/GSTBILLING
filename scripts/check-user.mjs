// Verify the demo user exists in Atlas and the password matches — isolates DB vs Vercel-config issues.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

async function main() {
  const uri = process.env.MONGODB_URI;
  console.log("URI host:", uri?.replace(/\/\/[^@]+@/, "//***@").slice(0, 60));
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "billeasy" });
  const db = mongoose.connection.db;
  console.log("Connected to dbName:", db.databaseName);

  const user = await db.collection("users").findOne({ email: "demo@billeasy.test" });
  console.log("demo user found:", !!user);
  if (user) {
    console.log("  has passwordHash:", !!user.passwordHash);
    console.log("  provider:", user.provider);
    console.log("  businessIds:", (user.businessIds || []).length);
    if (user.passwordHash) {
      console.log("  password 'demo123' matches:", await bcrypt.compare("demo123", user.passwordHash));
    }
  }

  console.log("total users in db:", await db.collection("users").countDocuments());
  console.log("total businesses:", await db.collection("businesses").countDocuments());
  await mongoose.disconnect();
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
