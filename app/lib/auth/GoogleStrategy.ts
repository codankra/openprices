import { OAuth2Strategy } from "remix-auth-oauth2";
import type { Strategy } from "remix-auth/strategy";

/**
 * @see https://developers.google.com/identity/protocols/oauth2/scopes
 */
export type GoogleScope = string;

export type GoogleStrategyOptions = {
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  /**
   * @default "openid profile email"
   */
  scopes?: GoogleScope[];
  accessType?: "online" | "offline";
  includeGrantedScopes?: boolean;
  prompt?: "none" | "consent" | "select_account";
  hd?: string;
  loginHint?: string;
};

interface OAuth2Profile {
  provider: string;
  name?: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
  };
}

export type GoogleProfile = {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: [{ value: string; type?: string }];
  photos: [{ value: string }];
  _json: {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
    email: string;
    email_verified: boolean;
    hd: string;
  };
} & OAuth2Profile;

export type GoogleExtraParams = {
  expires_in: 3920;
  token_type: "Bearer";
  scope: string;
  id_token: string;
} & Record<string, string | number>;

export const GoogleStrategyScopeSeperator = " ";
export const GoogleStrategyDefaultScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(GoogleStrategyScopeSeperator);
export const GoogleStrategyDefaultName = "google";

export class GoogleStrategy<User> extends OAuth2Strategy<User> {
  public static userInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo";
  public override name = GoogleStrategyDefaultName;

  private readonly accessType: string;

  private readonly prompt?: "none" | "consent" | "select_account";

  private readonly includeGrantedScopes: boolean;

  private readonly hd?: string;

  private readonly loginHint?: string;

  private readonly responseType: string;

  constructor(
    {
      clientId,
      clientSecret,
      redirectURI,
      scopes,
      accessType,
      includeGrantedScopes,
      prompt,
      hd,
      loginHint,
    }: GoogleStrategyOptions,
    verify: Strategy.VerifyFunction<User, OAuth2Strategy.VerifyOptions>
  ) {
    super(
      {
        clientId,
        clientSecret,
        redirectURI,
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        scopes: GoogleStrategy.parseScopes(scopes),
      },
      async (options) => {
        // const user await this.userProfile(options.tokens.accessToken);
        return verify(options);
      }
    );

    this.responseType = "code";
    this.accessType = accessType ?? "online";
    this.includeGrantedScopes = includeGrantedScopes ?? false;
    this.prompt = prompt;
    this.hd = hd;
    this.loginHint = loginHint;
  }

  protected override authorizationParams(
    params: URLSearchParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: Request
  ): URLSearchParams {
    const newParams = new URLSearchParams(params);
    newParams.set("access_type", this.accessType);
    newParams.set("include_granted_scopes", String(this.includeGrantedScopes));
    if (this.options.clientId) {
      newParams.set("client_id", this.client.clientId);
    }
    if (this.options.scopes) {
      newParams.set("scope", this.stringifyScopes(this.options.scopes));
    }
    if (this.options.redirectURI) {
      newParams.set(
        "redirect_uri",
        typeof this.options.redirectURI === "string"
          ? this.options.redirectURI
          : this.options.redirectURI.toString()
      );
    }
    if (this.responseType) {
      newParams.set("response_type", this.responseType);
    }
    if (this.prompt) {
      newParams.set("prompt", this.prompt);
    }
    if (this.hd) {
      newParams.set("hd", this.hd);
    }
    if (this.loginHint) {
      newParams.set("login_hint", this.loginHint);
    }
    return newParams;
  }

  protected stringifyScopes(scopes: GoogleScope[]) {
    return scopes.join(GoogleStrategyScopeSeperator);
  }

  public static async userProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch(GoogleStrategy.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const raw: GoogleProfile["_json"] = await response.json();
    const profile: GoogleProfile = {
      provider: "google",
      id: raw.sub,
      displayName: raw.name,
      name: {
        familyName: raw.family_name,
        givenName: raw.given_name,
      },
      emails: [{ value: raw.email }],
      photos: [{ value: raw.picture }],
      _json: raw,
    };
    return profile;
  }

  // Allow users the option to pass a scope string, or typed array
  public static parseScopes(scopes: GoogleStrategyOptions["scopes"]) {
    if (!scopes || scopes.length === 0) {
      return [GoogleStrategyDefaultScopes];
    }

    return scopes;
  }
}
