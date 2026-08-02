import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import type { ProjectEt } from "../domain/entities/project";
import {
  ApiGatewayException,
  HttpStatusCode,
  MockApiException,
} from "../domain/exceptions/exception";
import {
  AgentChatUsecase,
  AGENT_CHAT_GENERIC_ERROR_MESSAGE,
} from "../domain/usecases/agent_orchestration/agent_chat";
import { ChatSessionsUsecase } from "../domain/usecases/agent_orchestration/chat_sessions";
import { ChatTurnBlobsUsecase } from "../domain/usecases/agent_orchestration/chat_turn_blobs";
import { ChatTurnEventsUsecase } from "../domain/usecases/agent_orchestration/chat_turn_events";
import { ProjectsUsecase } from "../domain/usecases/mock_api/projects";
import { assertOrganizationHasAiCredits } from "../domain/usecases/organizations/plans";
import type { AppContext } from "../context";
import { logger } from "../infrastructure/logger";
import { createProjectChatSessionDto } from "./dtos/agent_orchestration/chat_sessions";
import { createProjectChatTurnDto } from "./dtos/agent_orchestration/agent_chat";
import { getNumber, getString } from "./utils";

type ProjectsUsecaseApi = ReturnType<typeof ProjectsUsecase>;
type AgentChatUsecaseApi = ReturnType<typeof AgentChatUsecase>;
type ChatSessionsUsecaseApi = ReturnType<typeof ChatSessionsUsecase>;

const getChatSessionSortBy = (value: unknown): "name" | "created_at" => {
  return value === "name" || value === "created_at" ? value : "created_at";
};

const getSortOrder = (value: unknown): "asc" | "desc" => {
  return value === "asc" || value === "desc" ? value : "desc";
};

const getAuthenticatedUser = (
  user: AuthenticatedUser | undefined,
): AuthenticatedUser => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
};

const validateProjectAccess = async (
  projects: ProjectsUsecaseApi,
  user: AuthenticatedUser,
  project_id: string,
): Promise<ProjectEt> => {
  return projects.getProject(user, project_id);
};

const validateChatOwnership = async (
  chat_sessions: ChatSessionsUsecaseApi,
  project_id: string,
  chat_id: string,
): Promise<void> => {
  const count = await chat_sessions.countChatSessions({
    ids: [chat_id],
    project_ids: [project_id],
  });

  if (count === 0) {
    throw Object.assign(new Error(`Chat not found with ID '${chat_id}'`), {
      status_code: 404,
    });
  }
};

const validateTurnOwnership = async (
  agent_chat: AgentChatUsecaseApi,
  chat_id: string,
  turn_id: string,
) => {
  const turnStatus = await agent_chat.getTurnStatus(turn_id);

  if (turnStatus.chat_session_id !== chat_id) {
    throw Object.assign(new Error(`Turn not found with ID '${turn_id}'`), {
      status_code: 404,
    });
  }

  return turnStatus;
};

export const addProjectChatRoutes = (app: Hono, ctx: AppContext) => {
  const projects = ProjectsUsecase(ctx);
  const agent_chat = AgentChatUsecase(ctx);
  const chat_sessions = ChatSessionsUsecase(ctx);
  const chat_turn_events = ChatTurnEventsUsecase(ctx);
  const chat_turn_blobs = ChatTurnBlobsUsecase(ctx);

  app.get("/api/v1/projects/:project_id/chats", async (c) => {
    const project_id = c.req.param("project_id");
    const user = getAuthenticatedUser(c.var.user);
    const query = c.req.query();

    await validateProjectAccess(projects, user, project_id);

    const filters: { project_ids?: string[] } = {
      project_ids: [project_id],
    };

    const result = await chat_sessions.getChatSessions(
      filters,
      {
        limit: getNumber(query.limit, 50),
        offset: getNumber(query.offset, 0),
      },
      {
        by: getChatSessionSortBy(getString(query.sort_by)),
        order: getSortOrder(getString(query.sort_order)),
      },
    );

    return c.json(result);
  });

  // POST /api/v1/projects/:project_id/chats
  app.post("/api/v1/projects/:project_id/chats", async (c) => {
    const project_id = c.req.param("project_id");
    const user = getAuthenticatedUser(c.var.user);
    const parsed = createProjectChatSessionDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const { name, description } = parsed.data;

    await validateProjectAccess(projects, user, project_id);

    const session =
      await chat_sessions.createChatSessionWithDefaultAgentConfig({
        project_id,
        name,
        description: description ?? null,
      });

    return c.json(session, 201);
  });

  // POST /api/v1/projects/:project_id/chats/:chat_id/turns
  app.post("/api/v1/projects/:project_id/chats/:chat_id/turns", async (c) => {
    const project_id = c.req.param("project_id");
    const chat_id = c.req.param("chat_id");
    const user = getAuthenticatedUser(c.var.user);

    const project = await validateProjectAccess(projects, user, project_id);
    await validateChatOwnership(chat_sessions, project_id, chat_id);
    await assertOrganizationHasAiCredits(ctx.db, project.organization_id);

    const parsed = createProjectChatTurnDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const message = parsed.data.message?.trim() ?? "";
    const files = parsed.data.files ?? [];

    if (files.length > 0) {
      const blobCount = await chat_turn_blobs.countChatTurnBlobs({
        ids: files.map((file) => file.id),
      });

      if (blobCount !== files.length) {
        throw new ApiGatewayException({
          public_message: "One or more files were not found.",
        });
      }
    }

    const user_input = [
      ...(message
        ? [
            {
              type: "text" as const,
              source: { type: "text" as const, text: message },
            },
          ]
        : []),
      ...files.map((file) => ({
        type: "file" as const,
        source: {
          type: "blob_store" as const,
          id: file.id,
        },
      })),
    ];

    const turnId = await agent_chat.createChatTurn(chat_id, {
      user_input,
    });

    return c.json({ id: turnId }, 201);
  });

  // GET /api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/status
  app.get(
    "/api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/status",
    async (c) => {
      const project_id = c.req.param("project_id");
      const chat_id = c.req.param("chat_id");
      const turn_id = c.req.param("turn_id");
      const user = getAuthenticatedUser(c.var.user);

      await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);

      const status = await validateTurnOwnership(agent_chat, chat_id, turn_id);

      return c.json(status);
    },
  );

  // GET /api/v1/projects/:project_id/chats/:chat_id/events
  app.get("/api/v1/projects/:project_id/chats/:chat_id/events", async (c) => {
    const project_id = c.req.param("project_id");
    const chat_id = c.req.param("chat_id");
    const user = getAuthenticatedUser(c.var.user);
    const query = c.req.query();

    await validateProjectAccess(projects, user, project_id);
    await validateChatOwnership(chat_sessions, project_id, chat_id);

    const limit = getNumber(query.limit, 50);
    if (limit > 100) {
      throw new MockApiException({
        public_message: `Limit should be less than or equal to 100`,
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }
    const offset = getNumber(query.offset, 0);

    const [result, prompts] = await Promise.all([
      chat_turn_events.getChatTurnEvents(
        { chat_session_ids: [chat_id] },
        {
          limit,
          offset,
        },
        { by: "id", order: "desc" },
      ),
      chat_turn_events.getUnansweredPrompts(chat_id),
    ]);

    return c.json({ ...result, prompts });
  });

  // DELETE /api/v1/projects/:project_id/chats/:chat_id
  app.delete("/api/v1/projects/:project_id/chats/:chat_id", async (c) => {
    const project_id = c.req.param("project_id");
    const chat_id = c.req.param("chat_id");
    const user = getAuthenticatedUser(c.var.user);

    await validateProjectAccess(projects, user, project_id);
    await validateChatOwnership(chat_sessions, project_id, chat_id);

    await chat_sessions.deleteChatSession(chat_id);
    return c.body(null, 204);
  });

  // POST /api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/cancel
  app.post(
    "/api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/cancel",
    async (c) => {
      const project_id = c.req.param("project_id");
      const chat_id = c.req.param("chat_id");
      const turn_id = c.req.param("turn_id");
      const user = getAuthenticatedUser(c.var.user);

      await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);
      await validateTurnOwnership(agent_chat, chat_id, turn_id);

      agent_chat.cancelChatTurn(turn_id);
      return c.json({ success: true }, 200);
    },
  );

  // GET /api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/stream
  app.get(
    "/api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/stream",
    async (c) => {
      const project_id = c.req.param("project_id");
      const chat_id = c.req.param("chat_id");
      const turn_id = c.req.param("turn_id");
      const user = getAuthenticatedUser(c.var.user);

      const project = await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);
      await validateTurnOwnership(agent_chat, chat_id, turn_id);

      c.header("Content-Encoding", "Identity");
      return streamSSE(c, async (stream) => {
        let unsubscribe = () => {};

        stream.onAbort(() => {
          unsubscribe();
        });

        try {
          // 1. Replay existing events from the database
          const existingEvents = await chat_turn_events.getChatTurnEvents(
            { chat_turn_ids: [turn_id] },
            { limit: 100, offset: 0 },
            { by: "id", order: "desc" },
          );

          for (const event of existingEvents.records) {
            await stream.writeSSE({ data: JSON.stringify(event) });
          }

          // 2. Check if already settled
          const isSettled = existingEvents.records.some(
            (event) => event.event_type === "turn-settled",
          );

          if (isSettled) {
            return;
          }

          // 3. Subscribe to the event bus for live events
          const settled = new Promise<void>((resolve) => {
            unsubscribe = agent_chat.subscribeToTurn(turn_id, (event) => {
              void stream.writeSSE({ data: JSON.stringify(event) });

              if (event.type === "turn-settled") {
                unsubscribe();
                resolve();
              }
            });
          });

          agent_chat.executeChatTurn(
            chat_id,
            turn_id,
            project.organization_id,
            user.id,
            { project_id, user },
          );

          await settled;
        } catch (error) {
          logger.error(
            { err: error, chat_id, turn_id },
            "Failed to start chat turn stream",
          );
          unsubscribe();
          await stream.writeSSE({
            data: JSON.stringify({
              type: "error",
              error: AGENT_CHAT_GENERIC_ERROR_MESSAGE,
            }),
          });
        }
      });
    },
  );
};
