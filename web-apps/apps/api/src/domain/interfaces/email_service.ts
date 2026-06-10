export interface EmailService {
  sendOrganizationInvite(params: {
    to: string;
    organizationName: string;
    invitedBy: string;
    inviteUrl: string;
  }): Promise<void>;
}
