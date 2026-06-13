import { Link, useSearchParams } from "react-router";

import { getGoogleAuthStartUrl } from "../api/auth_api";
import { useAuthProviders } from "../hooks/auth_hooks";

type GoogleAuthEntryProps = {
  alternateAction: "signin" | "signup";
};

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
      <a
        className="button"
        href={getGoogleAuthStartUrl(returnTo)}
        aria-disabled={!googleEnabled}
        onClick={(event) => {
          if (!googleEnabled) {
            event.preventDefault();
          }
        }}
      >
        Continue with Google
      </a>
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
