import {
  ApiGatewayException,
  HttpStatusCode,
} from "../exceptions/exception";
import type { ProviderIdentity } from "../interfaces/auth_service";

type GoogleProviderConfig = {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
};

type GoogleTokenResponse = {
  id_token?: string;
};

type GoogleTokenInfoResponse = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
};

const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleTokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo";

const isVerifiedEmail = (value: string | boolean | undefined) => {
  return value === true || value === "true";
};

export const GoogleAuthProvider = (config: GoogleProviderConfig) => ({
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });

    return `${googleAuthUrl}?${params.toString()}`;
  },
  async exchangeCallback(code: string): Promise<ProviderIdentity> {
    const tokenResponse = await fetch(googleTokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uri: config.redirect_uri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !tokenJson.id_token) {
      throw new ApiGatewayException({
        public_message: "Google sign in failed",
        status_code: HttpStatusCode.UNAUTHORIZED,
      });
    }

    const infoResponse = await fetch(
      `${googleTokenInfoUrl}?${new URLSearchParams({
        id_token: tokenJson.id_token,
      }).toString()}`,
    );
    const info = (await infoResponse.json()) as GoogleTokenInfoResponse;

    if (!infoResponse.ok || info.aud !== config.client_id || !info.sub) {
      throw new ApiGatewayException({
        public_message: "Google sign in failed",
        status_code: HttpStatusCode.UNAUTHORIZED,
      });
    }

    return {
      provider: "google",
      provider_subject: info.sub,
      email: isVerifiedEmail(info.email_verified) ? (info.email ?? null) : null,
      display_name: info.name ?? null,
      avatar_url: info.picture ?? null,
    };
  },
});
