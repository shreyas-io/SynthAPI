import { AppContext } from "../..";
import {
  GenerationRequest,
  GenerationResponse,
} from "../../domain/entities/generation";
import { ITextGeneration } from "../../domain/entities/interfaces/text_generation";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { generateTextViaGoogle } from "./vendors/google";
import { generateTextViaMeta } from "./vendors/meta";
import { generateTextViaNvidia } from "./vendors/nvidia";

async function generate(
  ctx: AppContext,
  request: GenerationRequest,
): Promise<GenerationResponse> {
  switch (request.config.model_provider) {
    case "nvidia":
      return generateTextViaNvidia(ctx).generateText(request);
    case "google":
      return generateTextViaGoogle(ctx).generateText(request);
    case "meta":
      return generateTextViaMeta(ctx).generateText(request);
    default:
      throw new AgentOrchestrationException({
        public_message: `Model provider '${request.config.model_provider}' is not supported.`,
      });
  }
}

export function generateText(ctx: AppContext): ITextGeneration {
  return {
    generateText: (req: GenerationRequest) => generate(ctx, req),
  };
}
