// app/services/user.server.ts
import { db } from "~/db";
import { users } from "~/db/schema";
import { eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export type User = {
  id: string;
  email: string;
  name: string | null;
  githubId: string | null;
  googleId: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

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
    return { id: user.id, email: user.email, name: user.name };
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

  return { id: newUser.id, email: newUser.email, name: newUser.name };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}
