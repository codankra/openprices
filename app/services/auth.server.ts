import { createCookieSessionStorage } from "@remix-run/node";
import { Authenticator, AuthorizationError } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { GoogleStrategy } from "remix-auth-google";

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

export const auth = new Authenticator<string>(sessionStorage);

auth.use(
  new GitHubStrategy(
    {
      clientId: process.env.AUTH_GITHUB_CLIENT_ID!,
      clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET!,
      redirectURI: `${process.env.SITE_NAME}/auth/callback?provider=github`,
    },
    async ({ profile, tokens, request, context }) => {
      // Here you should create or find a user in your database
      return profile.id;
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
    async ({
      profile,
      request,
      accessToken,
      refreshToken,
      extraParams,
      context,
    }) => {
      // Here you should create or find a user in your database
      return profile.id;
    }
  )
);
