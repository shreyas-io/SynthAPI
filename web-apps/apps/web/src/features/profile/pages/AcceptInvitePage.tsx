import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";

import { Button, ButtonLink } from "../../../components/atoms/Button";
import { acceptOrganizationInvite } from "../api/profile_api";

export function AcceptInvitePage() {
  const { inviteId } = useParams();
  const [accepted, setAccepted] = useState(false);

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteId) {
        throw new Error("Missing invite ID.");
      }

      await acceptOrganizationInvite(inviteId);
    },
    onSuccess: () => {
      setAccepted(true);
    },
  });

  return (
    <main className="page">
      <section className="card form invite-page-card">
        <p className="eyebrow">Organization Invite</p>
        <h1>{accepted ? "Invite accepted" : "Accept invite"}</h1>
        <p className="muted-text">
          {accepted
            ? "You can now access the organization from your workspace."
            : "Accept this invite to join the organization tied to your email address."}
        </p>

        {!accepted ? (
          <Button
            onClick={() => acceptInviteMutation.mutate()}
            disabled={acceptInviteMutation.isPending || !inviteId}
          >
            {acceptInviteMutation.isPending ? "Accepting..." : "Accept invite"}
          </Button>
        ) : (
          <ButtonLink to="/projects">
            Go to projects
          </ButtonLink>
        )}

        {acceptInviteMutation.isError && (
          <p className="error">{acceptInviteMutation.error.message}</p>
        )}
      </section>
    </main>
  );
}
