import type { EmailService } from "../../domain/interfaces/email_service";

type MailgunEmailServiceConfig = {
  apiKey: string;
  domain: string;
  baseUrl?: string;
  from: string;
  replyTo?: string;
};

export class MailgunEmailService implements EmailService {
  private readonly baseUrl: string;

  constructor(private readonly config: MailgunEmailServiceConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.mailgun.net";
  }

  async sendOrganizationInvite(params: {
    to: string;
    organizationName: string;
    invitedBy: string;
    inviteUrl: string;
  }): Promise<void> {
    const subject = `You're invited to join ${params.organizationName} on Mock Stack`;
    const text = [
      `${params.invitedBy} invited you to join ${params.organizationName} on Mock Stack.`,
      "",
      `Accept the invite: ${params.inviteUrl}`,
    ].join("\n");
    const html = [
      `<p>${escapeHtml(params.invitedBy)} invited you to join ${escapeHtml(params.organizationName)} on Mock Stack.</p>`,
      `<p><a href="${escapeHtml(params.inviteUrl)}">Accept the invite</a></p>`,
    ].join("");

    const formData = new FormData();
    formData.set("from", this.config.from);
    formData.set("to", params.to);
    formData.set("subject", subject);
    formData.set("text", text);
    formData.set("html", html);

    if (this.config.replyTo) {
      formData.set("h:Reply-To", this.config.replyTo);
    }

    const response = await fetch(
      `${this.baseUrl}/v3/${this.config.domain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString("base64")}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Mailgun send failed with ${response.status}: ${body || response.statusText}`,
      );
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
