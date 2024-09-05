import { createCookieSessionStorage } from "@remix-run/node";
import { Authenticator } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { GoogleStrategy } from "remix-auth-google";
import { findOrCreateUser, AuthUser } from "~/services/user.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.AUTH_COOKIE_SECRET!],
    secure: process.env.NODE_ENV === "production",
  },
});

export const auth = new Authenticator<AuthUser>(sessionStorage);

auth.use(
  new GitHubStrategy(
    {
      clientId: process.env.AUTH_GITHUB_CLIENT_ID!,
      clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET!,
      redirectURI: `${process.env.SITE_NAME}/auth/callback?provider=github`,
    },
    async ({ profile }) => {
      const user = await findOrCreateUser({
        email: profile.emails![0].value,
        name: profile.displayName,
        provider: "github",
        providerId: profile.id,
      });
      return user;
    }
  )
);

auth.use(
  new GoogleStrategy(
    {
      clientID: process.env.AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.SITE_NAME}/auth/callback?provider=google`,
    },
    async ({ profile }) => {
      const user = await findOrCreateUser({
        email: profile.emails[0].value,
        name: profile.displayName,
        provider: "google",
        providerId: profile.id!,
      });
      return user;
    }
  )
);
