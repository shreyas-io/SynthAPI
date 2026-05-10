import { AppContext } from "../../..";
import { AgentOrchestrationException } from "../../../exceptions/exception";

export async function generateResponseViaWorkersAi(
  ctx: AppContext,
  input: unknown,
): Promise<unknown> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ctx.environment.CLOUDFLARE_ACCOUNT_ID}/ai/v1/responses`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${ctx.environment.CLOUDFLARE_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AgentOrchestrationException({
      public_message: "Text generation failed.",
      message: `Workers AI response generation failed with status ${response.status}: ${JSON.stringify(body)}`,
    });
  }

  return body;
}
