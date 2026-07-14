import type { Express, Response } from "express";

import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import type { ProjectEt } from "../domain/entities/project";
import {
  ApiGatewayException,
  HttpStatusCode,
  MockApiException,
} from "../domain/exceptions/exception";
import { AgentChatUsecase } from "../domain/usecases/agent_orchestration/agent_chat";
import { ChatSessionsUsecase } from "../domain/usecases/agent_orchestration/chat_sessions";
import { ChatTurnBlobsUsecase } from "../domain/usecases/agent_orchestration/chat_turn_blobs";
import { ChatTurnEventsUsecase } from "../domain/usecases/agent_orchestration/chat_turn_events";
import { ProjectsUsecase } from "../domain/usecases/mock_api/projects";
import { assertOrganizationHasAiCredits } from "../domain/usecases/organizations/plans";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
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
  user: Express.Request["user"],
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

export const addProjectChatRoutes = (app: Express, ctx: AppContext) => {
  const projects = ProjectsUsecase(ctx);
  const agent_chat = AgentChatUsecase(ctx);
  const chat_sessions = ChatSessionsUsecase(ctx);
  const chat_turn_events = ChatTurnEventsUsecase(ctx);
  const chat_turn_blobs = ChatTurnBlobsUsecase(ctx);

  app.get(
    "/api/v1/projects/:project_id/chats",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const user = getAuthenticatedUser(req.user);

      await validateProjectAccess(projects, user, project_id);

      const filters: { project_ids?: string[] } = {
        project_ids: [project_id],
      };

      const result = await chat_sessions.getChatSessions(
        filters,
        {
          limit: getNumber(req.query.limit, 50),
          offset: getNumber(req.query.offset, 0),
        },
        {
          by: getChatSessionSortBy(getString(req.query.sort_by)),
          order: getSortOrder(getString(req.query.sort_order)),
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
      const user = getAuthenticatedUser(req.user);
      const parsed = createProjectChatSessionDto.safeParse(req.body);
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

      res.status(201).json(session);
    }),
  );

  // POST /api/v1/projects/:project_id/chats/:chat_id/turns
  app.post(
    "/api/v1/projects/:project_id/chats/:chat_id/turns",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;
      const user = getAuthenticatedUser(req.user);

      const project = await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);
      await assertOrganizationHasAiCredits(ctx.db, project.organization_id);

      const parsed = createProjectChatTurnDto.safeParse(req.body);
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
      const user = getAuthenticatedUser(req.user);

      await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);

      const status = await validateTurnOwnership(agent_chat, chat_id, turn_id);

      res.json(status);
    }),
  );

  // GET /api/v1/projects/:project_id/chats/:chat_id/events
  app.get(
    "/api/v1/projects/:project_id/chats/:chat_id/events",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;
      const user = getAuthenticatedUser(req.user);

      await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);

      const limit = getNumber(req.query.limit, 50);
      if (limit > 100) {
        throw new MockApiException({
          public_message: `Limit should be less than or equal to 100`,
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }
      const offset = getNumber(req.query.offset, 0);

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

      res.json({ ...result, prompts });
    }),
  );

  // DELETE /api/v1/projects/:project_id/chats/:chat_id
  app.delete(
    "/api/v1/projects/:project_id/chats/:chat_id",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;
      const user = getAuthenticatedUser(req.user);

      await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);

      await chat_sessions.deleteChatSession(chat_id);
      res.status(204).end();
    }),
  );

  // POST /api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/cancel
  app.post(
    "/api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/cancel",
    asyncRoute(async (req, res) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;
      const turn_id = req.params.turn_id as string;
      const user = getAuthenticatedUser(req.user);

      await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);
      await validateTurnOwnership(agent_chat, chat_id, turn_id);

      agent_chat.cancelChatTurn(turn_id);
      res.status(200).json({ success: true });
    }),
  );

  // GET /api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/stream
  app.get(
    "/api/v1/projects/:project_id/chats/:chat_id/turns/:turn_id/stream",
    asyncRoute(async (req, res: Response) => {
      const project_id = req.params.project_id as string;
      const chat_id = req.params.chat_id as string;
      const turn_id = req.params.turn_id as string;
      const user = getAuthenticatedUser(req.user);

      const project = await validateProjectAccess(projects, user, project_id);
      await validateChatOwnership(chat_sessions, project_id, chat_id);
      await validateTurnOwnership(agent_chat, chat_id, turn_id);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      // 1. Replay existing events from the database
      const existingEvents = await chat_turn_events.getChatTurnEvents(
        { chat_turn_ids: [turn_id] },
        { limit: 100, offset: 0 },
        { by: "id", order: "desc" },
      );

      for (const event of existingEvents.records) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // 2. Check if already settled
      const isSettled = existingEvents.records.some(
        (event) => event.event_type === "turn-settled",
      );

      if (isSettled) {
        res.end();
        return;
      }

      // 3. Subscribe to the event bus for live events
      let unsubscribe = () => {};

      try {
        unsubscribe = agent_chat.subscribeToTurn(turn_id, (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);

          if (event.type === "turn-settled") {
            unsubscribe();
            res.end();
          }
        });

        agent_chat.executeChatTurn(
          chat_id,
          turn_id,
          project.organization_id,
          user.id,
          { project_id, user },
        );

        req.on("close", () => {
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
