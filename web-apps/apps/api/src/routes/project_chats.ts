import type { Express, Response } from "express";

import { asyncRoute } from "../middleware/async_route";
import type { OrchestrationEngine } from "../server";

export type ProjectChatsSdk = {
  agent_orchestration: OrchestrationEngine;
};

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
};

const getNumber = (value: unknown, fallback: number): number => {
  const stringValue = getString(value);
  const numberValue = stringValue ? Number(stringValue) : fallback;

  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const validateChatOwnership = async (
  agent_orchestration: OrchestrationEngine,
  project_id: string,
  chat_id: string,
): Promise<void> => {
  const count = await agent_orchestration.chat_sessions.countChatSessions({
    ids: [chat_id],
    project_ids: [project_id],
  });

  if (count === 0) {
    throw Object.assign(new Error(`Chat not found with ID '${chat_id}'`), {
      status_code: 404,
    });
  }
};

export const addProjectChatRoutes = (
  app: Express,
  agent_orchestration: OrchestrationEngine,
) => {
  // GET /api/v1/projects/:project_id/chats
  app.get(
    "/api/v1/projects/:project_id/chats",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;

      const filters: { project_ids?: string[] } = {
        project_ids: [project_id],
      };

      const result = await agent_orchestration.chat_sessions.listChatSessions(
        filters,
        {
          limit: getNumber(req.query.limit, 50),
          offset: getNumber(req.query.offset, 0),
        },
        {
          by: getString(req.query.sort_by) ?? "created_at",
          order: getString(req.query.sort_order) ?? "desc",
        },
      );

      res.json(result);
    }),
  );

  // POST /api/v1/projects/:project_id/chats
  app.post(
    "/api/v1/projects/:project_id/chats",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const { name, description } = req.body as {
        name: string;
        description?: string | null;
      };

      const session =
        await agent_orchestration.chat_sessions.createChatSessionWithDefaultAgentConfig(
          { project_id, name, description: description ?? null },
        );

      res.status(201).json(session);
    }),
  );

  // POST /api/v1/projects/:project_id/chats/:chat_id/turns
  app.post(
    "/api/v1/projects/:project_id/chats/:chat_id/turns",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;

      await validateChatOwnership(agent_orchestration, project_id, chat_id);

      const { message, mode } = req.body as {
        message: string;
        mode?: "execution" | "planning";
      };

      const user_input = [
        {
          type: "text" as const,
          source: { type: "text" as const, text: message },
        },
      ];

      const turnId = await agent_orchestration.agent_chat.createChatTurn(
        chat_id,
        { user_input, mode: mode ?? "execution" },
        { project_id },
      );

      res.status(201).json({ id: turnId });
    }),
  );

  // GET /api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/status
  app.get(
    "/api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/status",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;
      const turn_id = req.params.turn_id as string;

      await validateChatOwnership(agent_orchestration, project_id, chat_id);

      const status =
        await agent_orchestration.agent_chat.getTurnStatus(turn_id);

      res.json(status);
    }),
  );

  // GET /api/v1/projects/:project_id/chats/:chat_id/events
  app.get(
    "/api/v1/projects/:project_id/chats/:chat_id/events",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;

      await validateChatOwnership(agent_orchestration, project_id, chat_id);

      const result =
        await agent_orchestration.chat_turn_events.listChatTurnEvents(
          { chat_session_ids: [chat_id] },
          {
            limit: getNumber(req.query.limit, 50),
            offset: getNumber(req.query.offset, 0),
          },
          { by: "sequence", order: "asc" },
        );

      res.json(result);
    }),
  );

  // GET /api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/stream
  app.get(
    "/api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/stream",
    asyncRoute(async (req, res: Response) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;
      const turn_id = req.params.turn_id as string;

      await validateChatOwnership(agent_orchestration, project_id, chat_id);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // 1. Replay existing events from the database
      const existingEvents =
        await agent_orchestration.chat_turn_events.listChatTurnEvents(
          { chat_turn_ids: [turn_id] },
          { limit: 100, offset: 0 },
          { by: "sequence", order: "asc" },
        );

      for (const event of existingEvents.records) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // 2. Check if already completed
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
