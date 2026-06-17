import { Link, useSearchParams } from "react-router";

import { ButtonAnchor } from "../../../components/atoms/Button";
import { getGoogleAuthStartUrl } from "../api/auth_api";
import { useAuthProviders } from "../hooks/auth_hooks";

type GoogleAuthEntryProps = {
  alternateAction: "signin" | "signup";
};

function GoogleIcon() {
  return (
    <svg
      className="google-auth-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285f4"
        d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.5c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.6-4.9 3.6-8.2Z"
      />
      <path
        fill="#34a853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.8c-1 .7-2.4 1.1-4.2 1.1-3.1 0-5.7-2.1-6.6-4.9H1.6v2.9C3.5 21.3 7.4 24 12 24Z"
      />
      <path
        fill="#fbbc05"
        d="M5.4 14.5c-.2-.7-.4-1.5-.4-2.5s.1-1.7.4-2.5V6.6H1.6C.6 8.2 0 10 0 12s.6 3.8 1.6 5.4l3.8-2.9Z"
      />
      <path
        fill="#ea4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8L20 3.2C17.9 1.2 15.2 0 12 0 7.4 0 3.5 2.7 1.6 6.6l3.8 2.9c.9-2.8 3.5-4.7 6.6-4.7Z"
      />
    </svg>
  );
}

export function GoogleAuthEntry({ alternateAction }: GoogleAuthEntryProps) {
  const providers = useAuthProviders();
  const [searchParams] = useSearchParams();
  const hasGoogleError = searchParams.get("error") === "google";
  const googleEnabled = providers.data?.google.enabled ?? false;
  const returnTo = searchParams.get("return_to") ?? "/projects";

  return (
    <>
      {hasGoogleError && (
        <p className="error">Google sign in failed. Please try again.</p>
      )}
      {providers.isError && (
        <p className="error">{providers.error.message}</p>
      )}
      {providers.isPending && <p>Checking auth providers...</p>}
      {providers.data && !googleEnabled && (
        <p className="error">Google sign in is not configured.</p>
      )}
      <ButtonAnchor
        className="google-auth-button"
        href={getGoogleAuthStartUrl(returnTo)}
        aria-disabled={!googleEnabled}
        onClick={(event) => {
          if (!googleEnabled) {
            event.preventDefault();
          }
        }}
      >
        <GoogleIcon />
        Continue with Google
      </ButtonAnchor>
      {alternateAction === "signup" ? (
        <p>
          No account? <Link to="/signup">Create one</Link>
        </p>
      ) : (
        <p>
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      )}
    </>
  );
}
