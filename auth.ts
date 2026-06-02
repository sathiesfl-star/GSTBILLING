import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (creds) => {
      const email = String(creds?.email ?? "").toLowerCase().trim();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;

      await connectToDatabase();
      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        businessId: user.businessIds?.[0]?.toString() ?? null,
      };
    },
  }),
];

// Google is optional — only enabled when credentials are configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // link Google to an existing email-account
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    // For Google sign-in, ensure a User row exists in our DB (upsert by email).
    signIn: async ({ user, account }) => {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      await connectToDatabase();
      const existing = await User.findOne({ email });
      if (!existing) {
        await User.create({
          name: user.name,
          email,
          image: user.image,
          provider: "google",
        });
      }
      return true;
    },
    jwt: async ({ token, user, trigger }) => {
      // Credentials path passes `user.businessId` directly.
      if (user && "businessId" in user) {
        token.businessId = (user as { businessId?: string | null }).businessId ?? null;
        return token;
      }
      // Google path (or session refresh): look up the businessId from our DB by email.
      if ((!token.businessId || trigger === "update") && token.email) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: token.email.toLowerCase() });
        token.businessId = dbUser?.businessIds?.[0]?.toString() ?? null;
        if (dbUser) token.sub = dbUser._id.toString();
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.businessId = token.businessId ?? null;
      }
      return session;
    },
  },
});
