import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Avatar } from "../../../components/atoms/Avatar";
import { ResourceCard } from "../../../components/molecules/ResourceCard";
import {
  useCreateOrganization,
  useDeleteOrganization,
  useProfile,
  useRestoreOrganization,
} from "../hooks/profile_hooks";

type OrgTab = "active" | "deleted";

export function ProfilePage() {
  const profile = useProfile();
  const createOrgMutation = useCreateOrganization();
  const deleteOrgMutation = useDeleteOrganization();
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

  const canDelete = (role: string) => role === "owner" || role === "admin";

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
              <button
                type="submit"
                className="button primary-btn compact-action"
                disabled={createOrgMutation.isPending || !newOrgName.trim()}
              >
                Create
              </button>
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
                    onDelete={
                      canDelete(org.membership.role) &&
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
                    className="org-deleted"
                    secondaryAction={
                      canDelete(org.membership.role) &&
                      org.id !== user.default_organization_id ? (
                        <button
                          className="button secondary-btn compact-action"
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
                        </button>
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
      </section>
    </main>
  );
}
