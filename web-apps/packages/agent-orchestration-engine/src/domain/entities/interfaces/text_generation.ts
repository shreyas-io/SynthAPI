import type { GenerationRequest, GenerationResponse } from "../generation";

export interface ITextGeneration {
  generateText(req: GenerationRequest): Promise<GenerationResponse>;
}
