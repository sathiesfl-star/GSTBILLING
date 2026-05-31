import { auth } from "@/auth";

/** The current logged-in user's active businessId, or null if not signed in. */
export async function getActiveBusinessId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.businessId ?? null;
}

export async function getSession() {
  return auth();
}
