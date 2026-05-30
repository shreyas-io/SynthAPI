import {
  AssistantModelMessage,
  UserModelMessage,
  type ModelMessage,
} from "ai";

import type { GenerationRequest } from "../../domain/entities/generation";

export function toModelMessages(request: GenerationRequest): ModelMessage[] {
  const messages: ModelMessage[] = [];

  for (const message of request.config.input_messages) {
    if (message.role === "tool_call_response") {
      for (const toolResponse of message.content) {
        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: toolResponse.tool_use_id,
              toolName: toolResponse.name,
              output: { type: "text" as const, value: toolResponse.output },
            },
          ],
        });
      }

      continue;
    }

    messages.push({
      role: message.role,
      content: message.content.text,
    } as UserModelMessage | AssistantModelMessage);
  }

  return messages;
}
