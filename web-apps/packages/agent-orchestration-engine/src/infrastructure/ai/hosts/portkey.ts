import { Portkey } from "portkey-ai";

import { AppContext } from "../../..";
import { AgentOrchestrationException } from "../../../exceptions/exception";

let client: Portkey | null = null;

const toPortkeyProvider = (provider: string) =>
  provider.startsWith("@") ? provider : `@${provider}`;

function getPortkeyClient(ctx: AppContext): Portkey {
  if (client === null) {
    client = new Portkey({
      apiKey: ctx.environment.PORTKEY_API_KEY,
      provider: toPortkeyProvider(ctx.environment.PORTKEY_WORKERS_AI_PROVIDER),
      strictOpenAiCompliance: false,
    });
  }

  return client;
}

export async function generateTextViaPortkey(
  ctx: AppContext,
  input: unknown,
): Promise<unknown> {
  try {
    const client = getPortkeyClient(ctx);
    return client.chat.completions.create(input as any);
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text generation failed.",
      message: "Portkey text generation request failed.",
      cause: error,
    });
  }
}

export async function generateResponseViaPortkey(
  ctx: AppContext,
  input: unknown,
): Promise<unknown> {
  try {
    const client = getPortkeyClient(ctx);
    return await client.responses.create(input as any);
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text generation failed.",
      message: "Portkey response generation request failed.",
      cause: error,
    });
  }
}
