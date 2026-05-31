import { type StreamTextResult } from "ai";

import { AppContext } from "../../index.js";
import { GenerationRequest } from "../../domain/entities/generation";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { streamTextViaGoogle } from "./vendors/google_stream";
import { streamTextViaMeta } from "./vendors/meta_stream";
import { streamTextViaNvidia } from "./vendors/nvidia_stream";

export function streamText(ctx: AppContext) {
  return {
    streamText: async (
      request: GenerationRequest,
    ): Promise<StreamTextResult<any, any>> => {
      switch (request.config.model_provider) {
        case "nvidia":
          return streamTextViaNvidia(ctx).streamText(request);
        case "google":
          return streamTextViaGoogle(ctx).streamText(request);
        case "meta":
          return streamTextViaMeta(ctx).streamText(request);
        default:
          throw new AgentOrchestrationException({
            public_message: `Model provider '${request.config.model_provider}' is not supported.`,
          });
      }
    },
  };
}
