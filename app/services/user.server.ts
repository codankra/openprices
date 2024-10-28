// app/services/user.server.ts
import { db } from "~/db";
import { users } from "~/db/schema";
import { eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getReceiptsByContributorID } from "./receipt.server";
import { getPriceEntriesByContributorID } from "./price.server";

export type AuthUser = typeof users.$inferSelect;

export async function findOrCreateUser(profile: {
  email: string;
  name?: string | null;
  provider: "github" | "google";
  providerId: string;
}): Promise<AuthUser> {
  const existingUser = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email, profile.email),
        profile.provider === "github"
          ? eq(users.githubId, profile.providerId)
          : eq(users.googleId, profile.providerId)
      )
    )
    .limit(1);

  if (existingUser.length > 0) {
    const user = existingUser[0];
    if (profile.provider === "github" && user.githubId !== profile.providerId) {
      await db
        .update(users)
        .set({ githubId: profile.providerId })
        .where(eq(users.id, user.id));
    } else if (
      profile.provider === "google" &&
      user.googleId !== profile.providerId
    ) {
      await db
        .update(users)
        .set({ googleId: profile.providerId })
        .where(eq(users.id, user.id));
    }
    return user;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: uuidv4(),
      email: profile.email,
      name: profile.name || null,
      githubId: profile.provider === "github" ? profile.providerId : null,
      googleId: profile.provider === "google" ? profile.providerId : null,
    })
    .returning();

  return newUser;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function getUserContributionsById(id: string, days: number = 30) {
  try {
    const userPriceEntries = await getPriceEntriesByContributorID(id, days);
    const userReceipts = await getReceiptsByContributorID(id, days);
    return { userReceipts, userPriceEntries };
  } catch (error) {
    console.error("Error getting user contributions:", error);
    return { userReceipts: [], userPriceEntries: [] };
  }
}
