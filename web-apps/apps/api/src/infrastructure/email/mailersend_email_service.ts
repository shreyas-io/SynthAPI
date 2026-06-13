import type { IEmailService } from "../../domain/interfaces/email_service";

type MailerSendEmailServiceConfig = {
  apiKey: string;
  baseUrl?: string;
  from: string;
  replyTo?: string;
};

export class MailerSendEmailService implements IEmailService {
  private readonly baseUrl: string;

  constructor(private readonly config: MailerSendEmailServiceConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.mailersend.com/v1";
  }

  async sendOrganizationInvite(params: {
    to: string;
    organizationName: string;
    invitedBy: string;
    inviteUrl: string;
  }): Promise<void> {
    const subject = `You're invited to join ${params.organizationName} on SynthAPI`;
    const text = [
      `${params.invitedBy} invited you to join ${params.organizationName} on SynthAPI.`,
      "",
      "Open your invite:",
      `Accept the invite: ${params.inviteUrl}`,
      "",
      "This invite expires in 7 days.",
    ].join("\n");
    const html = renderInviteEmailHtml(params);

    const response = await fetch(`${this.baseUrl}/email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          email: this.config.from,
        },
        to: [
          {
            email: params.to,
          },
        ],
        subject,
        text,
        html,
        ...(this.config.replyTo
          ? {
              reply_to: {
                email: this.config.replyTo,
              },
            }
          : undefined),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `MailerSend send failed with ${response.status}: ${body || response.statusText}`,
      );
    }
  }
}

function renderInviteEmailHtml(params: {
  organizationName: string;
  invitedBy: string;
  inviteUrl: string;
}): string {
  const organizationName = escapeHtml(params.organizationName);
  const invitedBy = escapeHtml(params.invitedBy);
  const inviteUrl = escapeHtml(params.inviteUrl);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#000000;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#f8f8f2;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
            <tr>
              <td style="background:#080808;border:1px solid #111111;border-radius:14px;padding:36px 32px;box-shadow:0 0 0 1px rgba(17,17,17,0.8),0 18px 48px rgba(0,0,0,0.45);">
                <p style="margin:0 0 12px;font-size:12px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#66d9ef;font-weight:700;">
                  Organization Invite
                </p>
                <h1 style="margin:0 0 14px;font-size:32px;line-height:1.08;color:#f8f8f2;font-weight:800;letter-spacing:-0.03em;">
                  Join ${organizationName}
                </h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#a0a08e;">
                  <strong style="color:#f8f8f2;">${invitedBy}</strong> invited you to collaborate on <strong style="color:#f8f8f2;">${organizationName}</strong> in SynthAPI.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#111111;border:1px solid rgba(102,217,239,0.15);border-radius:10px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#f8f8f2;font-weight:700;">
                        What happens next
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#a0a08e;">
                        Accept the invite to access the organization workspace, collaborate with the team, and manage APIs from the shared dashboard.
                      </p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td align="center" bgcolor="#66d9ef" style="border-radius:6px;">
                      <a href="${inviteUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;line-height:1.2;font-weight:700;color:#272822;text-decoration:none;">
                        Accept invite
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#75715e;">
                  This invite expires in 7 days.
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#75715e;">
                  If the button does not work, paste this link into your browser:
                </p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.7;">
                  <a href="${inviteUrl}" style="color:#66d9ef;text-decoration:underline;">${inviteUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 6px 0;font-size:12px;line-height:1.6;color:#75715e;text-align:center;">
                Sent by SynthAPI
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
