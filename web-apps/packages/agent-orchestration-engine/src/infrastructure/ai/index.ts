import { AppContext } from "../..";
import {
  GenerationRequest,
  GenerationResponse,
} from "../../domain/entities/generation";
import { ITextGeneration } from "../../domain/entities/interfaces/text_generation";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { generateTextViaOpenAi } from "./vendors/openai";
import { generateTextViaQwen } from "./vendors/qwen";

async function generate(
  ctx: AppContext,
  request: GenerationRequest,
): Promise<GenerationResponse> {
  switch (request.config.model_provider) {
    case "qwen":
      return generateTextViaQwen(ctx).generateText(request);
    case "openai":
      return generateTextViaOpenAi(ctx).generateText(request);
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
