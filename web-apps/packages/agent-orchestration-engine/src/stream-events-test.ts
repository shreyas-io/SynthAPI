import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createApplication } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = await createApplication({
    environment: process.env as any,
  });

  try {
    // 1. Get an existing agent config (must have run seed_local.ts previously)
    const agentConfig = await app.database.db
      .selectFrom("agent_configs")
      .select("id")
      .where("key", "=", "local-default")
      .executeTakeFirst();

    if (!agentConfig) {
      throw new Error(
        "No agent config found. Please run seed_local.ts first to create 'local-default' agent config.",
      );
    }

    // 2. Create a chat session
    console.log("Creating a chat session...");
    const sessionId = await app.chat_sessions.createChatSession({
      agent_config_id: agentConfig.id,
      title: "Test Session",
    });

    console.log(`Chat session created: ${sessionId}`);

    // 3. Prepare output file
    const outputPath = path.join(__dirname, "..", "stream-events-output.jsonl");
    await fs.writeFile(outputPath, "");
    console.log(`Writing events to: ${outputPath}`);

    const events: Array<Record<string, unknown>> = [];

    // 4. Create the chat turn and subscribe to it
    console.log("Creating chat turn...");

    // We can use a Promise to wait until the chat turn is completed
    await new Promise<void>(async (resolve, reject) => {
      try {
        const turnId = await app.agent_chat.createChatTurn(sessionId, {
          user_input: [
            {
              type: "text",
              source: {
                type: "text",
                text: "Get me details of project 123.",
              },
            },
          ],
          mode: "execution",
        });

        console.log(`Chat turn created: ${turnId}`);
        console.log("Subscribing to events...");

        // Subscribe to events
        const unsubscribe = app.agent_chat.subscribeToTurn(
          turnId,
          (event: unknown) => {
            const e = event as Record<string, unknown>;
            events.push(e);
            fs.appendFile(outputPath, JSON.stringify(e) + "\n").catch(console.error);
          },
        );

        // We'll need a way to know when it finishes.
        // The AgentChat SDK fire-and-forgets executeChatTurn.
        // We can poll the database to check if the turn is completed,
        // or we could just wait for a short duration assuming completion
        // since the stream-events-test is a simple test script.
        // Let's poll for completion.

        const checkCompletion = setInterval(async () => {
          const turn = await app.database.db
            .selectFrom("chat_session_turns")
            .select("status")
            .where("id", "=", turnId)
            .executeTakeFirst();
            
          if (turn && turn.status === "completed") {
            clearInterval(checkCompletion);
            unsubscribe();
            resolve();
          } else if (turn && turn.status === "failed") {
            clearInterval(checkCompletion);
            unsubscribe();
            reject(new Error("Chat turn failed"));
          }
        }, 500);

      } catch (err) {
        reject(err);
      }
    });

    console.log(`\nDone. Captured ${events.length} event(s).`);
    console.log(
      "Event types:",
      [...new Set(events.map((e) => e.type))].join(", ") || "none",
    );
    console.log(`Output written to: ${outputPath}`);
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
