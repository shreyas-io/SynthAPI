import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  LogOut,
  RotateCcw,
  UserPlus,
  Users,
} from "lucide-react";

import { Avatar } from "../../../components/atoms/Avatar";
import { Button } from "../../../components/atoms/Button";
import { ResourceCard } from "../../../components/molecules/ResourceCard";
import { ApiError } from "../../../lib/api/client";
import {
  useCreateOrganization,
  useDeleteOrganization,
  useInviteOrganizationMember,
  useLeaveOrganization,
  useOrganizationInvites,
  useOrganizationMembers,
  useProfile,
  useRevokeOrganizationInvite,
  useRestoreOrganization,
} from "../hooks/profile_hooks";
import type { ProfileOrganization } from "../types";

type OrgTab = "active" | "deleted";

const canDeleteOrganization = (role: string) =>
  role === "owner" || role === "admin";
const canLeaveOrganization = (role: string) =>
  role === "admin" || role === "member";
const canInviteMember = (role: string) =>
  role === "owner" || role === "admin" || role === "member";
const canRevokeInvite = (role: string) => role === "owner" || role === "admin";
const getRolePillClass = (role: "owner" | "admin" | "member") =>
  `pill-${role}`;

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
};

type OrganizationAccessPanelProps = {
  organization: ProfileOrganization;
};

function OrganizationAccessPanel({
  organization,
}: OrganizationAccessPanelProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const membersQuery = useOrganizationMembers(organization.id, showMembersPanel);
  const invitesQuery = useOrganizationInvites(organization.id, showMembersPanel);
  const inviteMutation = useInviteOrganizationMember();
  const revokeInviteMutation = useRevokeOrganizationInvite();
  const inviteAllowed = canInviteMember(organization.membership.role);
  const revokeAllowed = canRevokeInvite(organization.membership.role);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();

    if (!email) {
      return;
    }

    inviteMutation.mutate(
      {
        organizationId: organization.id,
        email,
        role: "member",
      },
      {
        onSuccess() {
          setInviteEmail("");
        },
      },
    );
  };

  return (
    <div className="org-access-panel">
      <div className="org-access-actions">
        {inviteAllowed && (
          <Button
            variant="secondary"
            size="compact"
            className="org-access-toggle"
            onClick={() => setShowInviteForm((open) => !open)}
          >
            <UserPlus size={14} />
            {showInviteForm ? "Hide invite form" : "Invite member"}
          </Button>
        )}

        <Button
          variant="secondary"
          size="compact"
          className="org-access-toggle"
          onClick={() => setShowMembersPanel((open) => !open)}
        >
          <Users size={14} />
          {showMembersPanel ? "Hide members" : "View members"}
          {showMembersPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {showInviteForm && inviteAllowed && (
        <section className="org-access-content org-access-section">
          <div className="org-access-heading">
            <h3>Invite member</h3>
          </div>

          <form className="org-invite-form" onSubmit={handleInvite}>
            <input
              type="email"
              placeholder="Invite by email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
            <Button
              type="submit"
              size="compact"
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
            >
              Invite member
            </Button>
          </form>

          {inviteMutation.isError && (
            <p className="error">
              {getErrorMessage(
                inviteMutation.error,
                "Failed to invite member.",
              )}
            </p>
          )}
        </section>
      )}

      {showMembersPanel && (
        <div className="org-access-content org-access-grid">
          <section className="org-access-section">
            <div className="org-access-heading">
              <h3>Members</h3>
              {membersQuery.isSuccess && (
                <span className="muted-text">{membersQuery.data.length}</span>
              )}
            </div>

            {membersQuery.isPending ? (
              <p className="muted-text">Loading members...</p>
            ) : membersQuery.isError ? (
              <p className="error">
                {getErrorMessage(membersQuery.error, "Failed to load members.")}
              </p>
            ) : (
              <div className="org-access-list">
                {membersQuery.data.map((member) => (
                  <div className="org-access-row" key={member.id}>
                    <div className="org-access-row-copy">
                      <strong>{member.display_name ?? member.email ?? "Member"}</strong>
                      <span>{member.email ?? "No email address"}</span>
                    </div>
                    <span className={`pill ${getRolePillClass(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="org-access-section">
            <div className="org-access-heading">
              <h3>Pending invites</h3>
              {invitesQuery.isSuccess && (
                <span className="muted-text">{invitesQuery.data.length}</span>
              )}
            </div>

            {invitesQuery.isPending ? (
              <p className="muted-text">Loading invites...</p>
            ) : invitesQuery.isError ? (
              <p className="error">
                {getErrorMessage(invitesQuery.error, "Failed to load invites.")}
              </p>
            ) : invitesQuery.data.length === 0 ? (
              <p className="muted-text">No pending invites.</p>
            ) : (
              <div className="org-access-list">
                {invitesQuery.data.map((invite) => (
                  <div className="org-access-row" key={invite.id}>
                    <div className="org-access-row-copy">
                      <strong>{invite.email}</strong>
                      <span>
                        Member invite
                        {invite.invited_by_name
                          ? ` by ${invite.invited_by_name}`
                          : ""}
                      </span>
                      <span>
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                    {revokeAllowed && (
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => {
                          if (confirm(`Revoke invite for "${invite.email}"?`)) {
                            revokeInviteMutation.mutate({
                              organizationId: organization.id,
                              inviteId: invite.id,
                            });
                          }
                        }}
                        disabled={revokeInviteMutation.isPending}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {revokeInviteMutation.isError && (
              <p className="error">
                {getErrorMessage(
                  revokeInviteMutation.error,
                  "Failed to revoke invite.",
                )}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export function ProfilePage() {
  const profile = useProfile();
  const createOrgMutation = useCreateOrganization();
  const deleteOrgMutation = useDeleteOrganization();
  const leaveOrgMutation = useLeaveOrganization();
  const restoreOrgMutation = useRestoreOrganization();
  const [newOrgName, setNewOrgName] = useState("");
  const [orgTab, setOrgTab] = useState<OrgTab>("active");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    createOrgMutation.mutate(newOrgName.trim(), {
      onSuccess() {
        setNewOrgName("");
      },
    });
  };

  if (profile.isPending) {
    return (
      <main className="page">
        <p>Loading profile...</p>
      </main>
    );
  }

  if (profile.isError) {
    return (
      <main className="page">
        <p className="error">Failed to load profile.</p>
      </main>
    );
  }

  const { user, organizations } = profile.data;

  const activeOrgs = organizations.filter((org) => org.deleted_at == null);
  const deletedOrgs = organizations.filter((org) => org.deleted_at != null);

  return (
    <main className="page profile-page">
      <div className="page-header">
        <h1>Profile</h1>
      </div>

      <section className="profile-section card">
        <h2>User Details</h2>
        <div className="profile-info">
          <Avatar
            src={user.avatar_url}
            label={user.display_name ?? user.email ?? "User"}
            alt={user.display_name ?? "User avatar"}
            className="profile-avatar"
            fallbackClassName="profile-avatar-placeholder"
          />
          <div className="profile-details">
            <p>
              <strong>Name:</strong> {user.display_name ?? "—"}
            </p>
            <p>
              <strong>Email:</strong> {user.email ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="section-heading">
          <h2>Organisations</h2>
        </div>

        <div className="org-tabs">
          <button
            className={orgTab === "active" ? "active" : ""}
            onClick={() => setOrgTab("active")}
          >
            Active
          </button>
          <button
            className={orgTab === "deleted" ? "active" : ""}
            onClick={() => setOrgTab("deleted")}
          >
            Deleted
          </button>
        </div>

        {orgTab === "active" && (
          <>
            <form className="profile-create-org" onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="New organisation name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={createOrgMutation.isPending}
              />
              <Button
                type="submit"
                size="compact"
                disabled={createOrgMutation.isPending || !newOrgName.trim()}
              >
                Create
              </Button>
            </form>

            {createOrgMutation.isError && (
              <p className="error">Failed to create organisation.</p>
            )}

            {activeOrgs.length === 0 ? (
              <p className="muted-text">No active organisations.</p>
            ) : (
              <div className="org-list">
                {activeOrgs.map((org) => (
                  <ResourceCard
                    key={org.id}
                    title={org.name}
                    pill={org.membership.role}
                    pillClassName={getRolePillClass(org.membership.role)}
                    onDelete={
                      canDeleteOrganization(org.membership.role) &&
                      org.id !== user.default_organization_id
                        ? () => {
                            if (
                              confirm(
                                `Are you sure you want to delete "${org.name}"?`,
                              )
                            ) {
                              deleteOrgMutation.mutate(org.id);
                            }
                          }
                        : undefined
                    }
                    deleteDisabled={deleteOrgMutation.isPending}
                    deleteLabel={`Delete ${org.name}`}
                    secondaryAction={
                      canLeaveOrganization(org.membership.role) ? (
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => {
                            if (
                              confirm(
                                `Leave organisation "${org.name}"?`,
                              )
                            ) {
                              leaveOrgMutation.mutate(org.id);
                            }
                          }}
                          disabled={leaveOrgMutation.isPending}
                        >
                          <LogOut size={14} />
                          Leave
                        </Button>
                      ) : undefined
                    }
                  >
                    <p>
                      <strong>Status:</strong> {org.membership.status}
                    </p>
                    {org.plan && (
                      <p>
                        <strong>Plan:</strong> {org.plan.name} ({org.plan.status})
                      </p>
                    )}
                    <p>
                      <strong>AI Credits:</strong> {org.ai_credits.remaining} /{" "}
                      {org.ai_credits.granted} remaining
                    </p>
                    <OrganizationAccessPanel organization={org} />
                  </ResourceCard>
                ))}
              </div>
            )}
          </>
        )}

        {orgTab === "deleted" && (
          <>
            <div className="org-deleted-banner">
              <AlertTriangle size={16} />
              Deleted organisations will be removed after 7 days of deletion.
            </div>

            {deletedOrgs.length === 0 ? (
              <p className="muted-text">No deleted organisations.</p>
            ) : (
              <div className="org-list deleted-grid">
                {deletedOrgs.map((org) => (
                  <ResourceCard
                    key={org.id}
                    title={org.name}
                    pill={org.membership.role}
                    pillClassName={getRolePillClass(org.membership.role)}
                    className="org-deleted"
                    secondaryAction={
                      canDeleteOrganization(org.membership.role) &&
                      org.id !== user.default_organization_id ? (
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => {
                            if (
                              confirm(
                                `Restore organisation "${org.name}"?`,
                              )
                            ) {
                              restoreOrgMutation.mutate(org.id);
                            }
                          }}
                          disabled={restoreOrgMutation.isPending}
                        >
                          <RotateCcw size={14} />
                          Restore
                        </Button>
                      ) : undefined
                    }
                  >
                    <p>
                      <strong>Deleted:</strong>{" "}
                      {new Date(org.deleted_at!).toLocaleString()}
                    </p>
                    {org.plan && (
                      <p>
                        <strong>Plan:</strong> {org.plan.name} ({org.plan.status})
                      </p>
                    )}
                    <p>
                      <strong>AI Credits:</strong> {org.ai_credits.remaining} /{" "}
                      {org.ai_credits.granted} remaining
                    </p>
                  </ResourceCard>
                ))}
              </div>
            )}
          </>
        )}

        {deleteOrgMutation.isError && (
          <p className="error">Failed to delete organisation.</p>
        )}
        {restoreOrgMutation.isError && (
          <p className="error">Failed to restore organisation.</p>
        )}
        {leaveOrgMutation.isError && (
          <p className="error">Failed to leave organisation.</p>
        )}
      </section>
    </main>
  );
}
