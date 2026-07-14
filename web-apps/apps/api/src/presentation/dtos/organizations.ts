import z from "zod";

export const createOrganizationDto = z.object({
  name: z.string().min(1).max(255),
});

export const addOrganizationMemberDto = z.object({
  email: z.email(),
  role: z.enum(["admin", "member", "viewer"]),
});

export const updateOrganizationMemberDto = z.object({
  status: z.enum(["active", "stale"]),
});

export const getInvitesQueryDto = z.object({
  status: z.enum(["pending", "accepted", "expired", "revoked"]).optional(),
});
