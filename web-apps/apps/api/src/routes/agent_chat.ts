import type { Express, Response } from "express";

import { asyncRoute } from "../middleware/async_route";
import type { OrchestrationEngine } from "../server";

export type AgentChatSdk = {
  createChatTurn: (chat_session_id: string, data: unknown) => Promise<string>;
  subscribeToTurn: (
    turnId: string,
    handler: (event: unknown) => void,
  ) => (() => void);
};

export const addAgentChatRoutes = (
  app: Express,
  agent_orchestration: OrchestrationEngine,
) => {
  app.post(
    "/api/v1/chats/:chat_id/turns",
    asyncRoute(async (req, res) => {
      const chat_id = req.params.chat_id as string;

      const count = await agent_orchestration.chat_sessions.countChatSessions({
        ids: [chat_id],
      });

      if (count === 0) {
        res.status(404).json({ message: `Chat not found with ID '${chat_id}'` });
        return;
      }

      const turnId = await agent_orchestration.agent_chat.createChatTurn(
        chat_id,
        req.body,
      );
      res.status(201).json({ id: turnId });
    }),
  );

  app.get(
    "/api/v1/chats/:chat_id/turns/:turn_id/stream",
    asyncRoute(async (req, res: Response) => {
      const chat_id = req.params.chat_id as string;
      const turn_id = req.params.turn_id as string;

      const count = await agent_orchestration.chat_sessions.countChatSessions({
        ids: [chat_id],
      });

      if (count === 0) {
        res.status(404).json({ message: `Chat not found with ID '${chat_id}'` });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // 1. Replay existing events from the database
      const existingEvents =
        await agent_orchestration.chat_turn_events.listChatTurnEvents(
          { chat_turn_ids: [turn_id] },
          { limit: 1000, offset: 0 },
          { by: "sequence", order: "asc" },
        );

      for (const event of existingEvents.records) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // 2. Check if already completed
      const turns = await agent_orchestration.chat_sessions.listChatSessions(
        { ids: [chat_id] },
        { limit: 1, offset: 0 },
        { by: "created_at", order: "asc" },
      );
      // Note: we don't have a direct getTurn method; we check via events or assume in_progress.
      // For simplicity, we poll the DB for turn status via the event list heuristic
      // (no tool_call_request after last assistant_message means done).
      // Better: add a getChatSessionTurn method. For now, poll event count.

      // Actually, let me use a simpler approach: check if the last event is assistant_message
      const isCompleted =
        existingEvents.records.length > 0 &&
        existingEvents.records[existingEvents.records.length - 1]
          ?.event_type === "assistant-message";

      if (isCompleted) {
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
        return;
      }

      // 3. Subscribe to the event bus for live events
      let unsubscribe = () => {};

      try {
        unsubscribe = agent_orchestration.agent_chat.subscribeToTurn(
          turn_id,
          (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          },
        );

        // 4. Poll for completion every 500ms
        const pollInterval = setInterval(async () => {
          const latestEvents =
            await agent_orchestration.chat_turn_events.listChatTurnEvents(
              { chat_turn_ids: [turn_id] },
              { limit: 1, offset: 0 },
              { by: "sequence", order: "desc" },
            );
          const lastEvent = latestEvents.records[0];
          if (lastEvent?.event_type === "assistant-message") {
            clearInterval(pollInterval);
            unsubscribe();
            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
          }
        }, 500);

        req.on("close", () => {
          clearInterval(pollInterval);
          unsubscribe();
        });
      } catch (error) {
        res.write(
          `data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`,
        );
        res.end();
      }
    }),
  );
};
