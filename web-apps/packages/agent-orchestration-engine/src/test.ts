import { createApplication } from "./index";
import type { GenerationRequest } from "./domain/entities/generation";

const app = createApplication({
  environment: process.env as any,
});

// ── Simple text generation (no tools) ─────────────────────────────

async function smokeTestTextOnly() {
  console.log("=== Smoke Test 1: Simple text generation ===");

  const response = await app.text_generation.generateText({
    config: {
      model_host: "workers_ai",
      model_provider: "google",
      model_gateway: null,
      model_id: "@cf/google/gemma-4-26b-a4b-it",
      system_prompt: "You are a concise assistant.",
      input_messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Say 'Hello from Ollama' and nothing else.",
          },
        },
      ],
      tools: [],
      temperature: 0.1,
      max_tokens: 50,
    },
    raw: null,
  });

  console.log("Response:");
  for (const part of response.content) {
    if (part.role === "assistant") {
      for (const c of part.content) {
        if (c.type === "text") console.log("  ", c.text);
      }
    }
  }
  console.log("");
}

// ── Tool calling loop ─────────────────────────────────────────────

const toolConfig: GenerationRequest["config"] = {
  model_host: "workers_ai",
  model_provider: "google",
  model_gateway: null,
  model_id: "@cf/google/gemma-4-26b-a4b-it",
  system_prompt: "You are a concise weather assistant. Use tools when needed.",
  input_messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "What is the weather in Bengaluru today?",
      },
    },
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get current weather for a location.",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City and region, for example Bengaluru, India.",
            },
            unit: {
              type: "string",
              enum: ["celsius", "fahrenheit"],
            },
          },
          required: ["location"],
        },
      },
    },
  ],
  temperature: 0.2,
  max_tokens: 500,
};

const executeTool = (name: string, input: string) => {
  switch (name) {
    case "get_weather": {
      const args = JSON.parse(input || "{}") as {
        location?: string;
        unit?: "celsius" | "fahrenheit";
      };
      return JSON.stringify({
        location: args.location ?? "Bengaluru, India",
        unit: args.unit ?? "celsius",
        temperature: 27,
        condition: "partly cloudy",
      });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

async function smokeTestWithTools() {
  console.log("=== Smoke Test 2: Tool calling ===");

  let response = await app.text_generation.generateText({
    config: toolConfig,
    raw: null,
  });

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const toolRequests = response.content
      .filter((item) => item.role === "tool_call_request")
      .flatMap((item) => item.content);

    if (!toolRequests.length) {
      break;
    }

    console.log(
      `  Tool calls (iteration ${iteration + 1}):`,
      toolRequests.map((t) => t.name).join(", "),
    );

    response = await app.text_generation.generateText({
      config: {
        ...toolConfig,
        input_messages: [
          {
            role: "tool_call_response",
            content: toolRequests.map((toolRequest) => ({
              tool_use_id: toolRequest.tool_use_id,
              name: toolRequest.name,
              output: executeTool(toolRequest.name, toolRequest.input),
            })),
          },
        ],
      },
      raw: response.raw,
    });
  }

  console.log("\nFinal response:");
  for (const part of response.content) {
    if (part.role === "assistant") {
      for (const c of part.content) {
        if (c.type === "text") console.log("  ", c.text);
      }
    }
  }
  console.log("");
}

// ── Run ───────────────────────────────────────────────────────────

await smokeTestTextOnly();
await smokeTestWithTools();
console.log("All smoke tests completed.");
