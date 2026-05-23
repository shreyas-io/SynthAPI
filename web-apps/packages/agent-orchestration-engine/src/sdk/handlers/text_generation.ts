import type { AppContext } from "../..";
import { generateText } from "../../infrastructure/ai";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { generationRequestDto } from "../dto/generation";

export function TextGeneration(ctx: AppContext) {
  const text_generation = generateText(ctx);

  return {
    generateText: (data: unknown) => {
      const { data: v, success, error } = generationRequestDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return text_generation.generateText(v);
    },
  };
}
