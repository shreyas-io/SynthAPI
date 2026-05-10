import { createApplication } from "./index";

const app = createApplication({
  environment: process.env as any,
});

const val = await app.text_generation.generateText({
  config: {
    model_host: "portkey",
    model_provider: "openai",
    model_id: "@cf/openai/gpt-oss-20b",
    input_messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "System: You are a concise weather assistant. Use the get_weather tool when the user asks for current weather.\n\nUser: What is the weather in Bengaluru today?",
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
  },
  raw: null,
});

console.dir(val, { depth: null });
