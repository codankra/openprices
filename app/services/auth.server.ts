import { createCookieSessionStorage, redirect } from "react-router";
import { Authenticator } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { GoogleStrategy } from "~/lib/auth/GoogleStrategy";
import { findOrCreateUser, AuthUser } from "~/services/user.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session_opd",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    secrets: [process.env.AUTH_COOKIE_SECRET!],
    secure: process.env.NODE_ENV === "production",
  },
});

export const auth = new Authenticator<AuthUser>();

auth.use(
  new GitHubStrategy(
    {
      clientId: process.env.AUTH_GITHUB_CLIENT_ID!,
      clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET!,
      redirectURI: `${process.env.SITE_NAME}/auth/callback?provider=github`,
      scopes: ["user:email"],
    },
    async ({ tokens }) => {
      const getGitHubProfile = async () => {
        const ghapiHeaders = {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokens.accessToken()}`,
          "X-GitHub-Api-Version": "2022-11-28",
        };
        const [responseProfile, responseEmails] = await Promise.all([
          fetch("https://api.github.com/user", {
            headers: ghapiHeaders,
          }),
          fetch("https://api.github.com/user/emails", {
            headers: ghapiHeaders,
          }),
        ]);
        let [userProfile, emails] = await Promise.all([
          responseProfile.json(),
          responseEmails.json(),
        ]);
        const profile = {
          ...userProfile,
          emails,
        };
        return profile;
      };
      const profile = await getGitHubProfile();
      const user = await findOrCreateUser({
        email: profile.emails![0].email,
        name: profile.name,
        provider: "github",
        providerId: profile.id,
        defaultLocation: profile.location,
      });
      return user;
    }
  )
);

auth.use(
  new GoogleStrategy(
    {
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.SITE_NAME}/auth/callback?provider=google`,
    },
    async ({ tokens }) => {
      const profile = await GoogleStrategy.userProfile(tokens.accessToken());
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
export async function requireAuth(request: Request, redirectTo?: string) {
  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  let user: AuthUser | null = session.get("user");
  if (!user) {
    const originalPath = redirectTo || new URL(request.url).pathname;
    session.set("redirectTo", originalPath);
    const commitedSession = await sessionStorage.commitSession(session);
    throw redirect(`/login`, {
      headers: {
        "Set-Cookie": commitedSession,
      },
    });
  }
  return user;
}

export async function checkAuth(request: Request) {
  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  let user: AuthUser | null = session.get("user");
  return user;
}
