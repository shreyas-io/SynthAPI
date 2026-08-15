import type { AppContext } from "../../../../server";
import { logger } from "../../../../infrastructure/logger";
import { uuidv7 } from "uuidv7";
import type {
  ChatSessionTurnEt,
  ChatTurnUserInput,
} from "../../../entities/agent_orchestration/chat_session_turn";
import {
  AGENT_CHAT_GENERIC_ERROR_MESSAGE,
  type ChatTurnEventPayload,
  type ChatTurnEventType,
} from "../../../entities/agent_orchestration/chat_turn_event";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { createChatTurn } from "./create";
import { createLangChainTools } from "../tools/langchain";
import {
  getPlanAiPricingForOrganization,
  type PlanAiPricing,
} from "../../organizations/pricing";
import { z } from "zod";
import { createMockApiRuleTreeDto } from "../../../../presentation/dtos/mock_api/mock_api_rule_tree";
import type { ToolWorkspaceContext } from "../tools/types";
import { AgentConfig } from "../../../configs/agent-config/config";
import {
  createAgent,
  createMiddleware,
  summarizationMiddleware,
} from "langchain";
import {
  createLlm,
  createFallbackMiddleware,
} from "../../../../infrastructure/agent_orchestration/langchain_llm";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { getPostgresConnString } from "../../../../config/utils";

export { AGENT_CHAT_GENERIC_ERROR_MESSAGE } from "../../../entities/agent_orchestration/chat_turn_event";

// Authoritative JSON Schema for a rule tree, generated from the same
// createMockApiRuleTreeDto zod schema that validates the `rule_tree` field at
// execution time. Kept in sync automatically — no hand-maintained copy.
const ruleTreeSchemaPromptSection = `\n\n## Rule Tree Schema\n\nThe JSON Schema for a rule tree (the \`rule_tree\` field on \`create_mock_api_response\` and \`update_mock_api_response\`) is below. Match it exactly.\n\n\`\`\`json\n${JSON.stringify(z.toJSONSchema(createMockApiRuleTreeDto), null, 2)}\n\`\`\`\n`;

const cancelledTurns = new Set<string>();

export const AgentChatUsecase = (ctx: AppContext) => {
  const eventBus = ctx.eventBus;
  const runningTurns = new Set<string>();
  const turnAbortControllers = new Map<string, AbortController>();

  type TokenUsage = {
    input_tokens: number;
    output_tokens: number;
  };

  const zeroUsage = (): TokenUsage => ({ input_tokens: 0, output_tokens: 0 });

  const addUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
  });

  type ModelPricing = (typeof AgentConfig.agent.models)[number]["pricing"];

  const calculateCost = (
    chat_pricing: ModelPricing,
    compaction_pricing: ModelPricing,
    plan_pricing: PlanAiPricing,
    chat_usage: TokenUsage,
    compaction_usage: TokenUsage,
    web_search_count: number,
  ): number => {
    const chat_cost =
      chat_usage.input_tokens * chat_pricing.input_tokens +
      chat_usage.output_tokens * chat_pricing.output_tokens;
    const compaction_cost =
      compaction_usage.input_tokens * compaction_pricing.input_tokens +
      compaction_usage.output_tokens * compaction_pricing.output_tokens;

    const web_search_cost = web_search_count * plan_pricing.web_search_cost_usd;

    return chat_cost + compaction_cost + web_search_cost;
  };

  const roundCredits = (min_credit_charge: number, credits: number): number => {
    const rounded = Math.round(credits * 100) / 100;
    return Math.max(rounded, min_credit_charge);
  };

  const getCreditGrantForUsage = async (organization_id: string) => {
    const active_grant = await ctx.db
      .selectFrom("organization_credit_grants")
      .select("id")
      .where("organization_id", "=", organization_id)
      .where("grant_type", "=", "ai_credits")
      .where("expires_at", ">", new Date())
      .orderBy("created_at", "asc")
      .executeTakeFirst();

    if (active_grant) return active_grant.id;

    const fallback_grant = await ctx.db
      .selectFrom("organization_credit_grants")
      .select("id")
      .where("organization_id", "=", organization_id)
      .where("grant_type", "=", "ai_credits")
      .orderBy("created_at", "asc")
      .executeTakeFirst();

    return fallback_grant?.id ?? null;
  };

  const recordCreditUsage = async (input: {
    organization_id: string;
    user_id: string;
    chat_turn_id: string;
    chat_usage: TokenUsage;
    compaction_usage: TokenUsage;
    web_search_count: number;
  }): Promise<void> => {
    const chat_pricing = AgentConfig.agent.models[0]?.pricing;
    const compaction_pricing = AgentConfig.compaction.models[0]?.pricing;
    if (!chat_pricing || !compaction_pricing) {
      throw new Error("Agent model pricing is not configured.");
    }

    const plan_pricing = await getPlanAiPricingForOrganization(
      ctx.db,
      input.organization_id,
    );

    const cost_usd = calculateCost(
      chat_pricing,
      compaction_pricing,
      plan_pricing,
      input.chat_usage,
      input.compaction_usage,
      input.web_search_count,
    );
    if (cost_usd <= 0) return;

    const credits = roundCredits(
      plan_pricing.min_credit_charge,
      cost_usd * plan_pricing.credits_per_usd,
    );
    const credit_grant_id = await getCreditGrantForUsage(input.organization_id);

    if (!credit_grant_id) {
      logger.warn(
        {
          organization_id: input.organization_id,
          chat_turn_id: input.chat_turn_id,
        },
        "No credit grant found for usage recording",
      );
      return;
    }

    await ctx.db
      .insertInto("organization_credit_usages")
      .values({
        id: uuidv7(),
        organization_id: input.organization_id,
        credit_grant_id,
        user_id: input.user_id,
        amount: credits,
        source_id: input.chat_turn_id,
      })
      .executeTakeFirstOrThrow();
  };

  const createAndPublishEvent = async (input: {
    chat_turn_id: string;
    event_type: ChatTurnEventType;
    payload: ChatTurnEventPayload;
  }) => {
    await ctx.db
      .insertInto("chat_turn_events")
      .values({
        id: uuidv7(),
        chat_turn_id: input.chat_turn_id,
        event_type: input.event_type,
        payload: JSON.stringify(input.payload),
      })
      .executeTakeFirstOrThrow();
    eventBus.publish(input.chat_turn_id, input.payload);
  };

  const executeChatTurnInternal = async ({
    chat_session_id,
    turn_id,
    organization_id,
    user_id,
    workspace,
    abort_signal,
  }: {
    chat_session_id: string;
    turn_id: string;
    organization_id: string;
    user_id: string;
    workspace: ToolWorkspaceContext;
    abort_signal: AbortSignal;
  }): Promise<void> => {
    const session = await ctx.db
      .selectFrom("chat_sessions")
      .select("id")
      .where("id", "=", chat_session_id)
      .executeTakeFirst();

    if (!session) {
      throw new AgentOrchestrationException({
        public_message: "Chat session not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    const turn = await ctx.db
      .selectFrom("chat_session_turns")
      .select(["status", "chat_session_id", "user_input"])
      .where("id", "=", turn_id)
      .where("chat_session_id", "=", chat_session_id)
      .executeTakeFirst();

    if (!turn || turn.status !== "in_progress") return;

    let totalChatUsage = zeroUsage();
    let totalCompactionUsage = zeroUsage();
    let webSearchCount = 0;
    let wasCancelled = false;

    try {
      const checkpointer = PostgresSaver.fromConnString(
        getPostgresConnString(ctx),
      );
      await checkpointer.setup();

      const llm = createLlm(
        ctx,
        AgentConfig.agent,
        turn.chat_session_id,
        user_id,
        chat_session_id,
      );
      const fallback = createFallbackMiddleware(
        ctx,
        AgentConfig.agent,
        turn.chat_session_id,
        user_id,
        chat_session_id,
      );
      const compaction_llm = createLlm(
        ctx,
        AgentConfig.compaction,
        turn.chat_session_id,
        user_id,
        chat_session_id,
      );

      const tools = createLangChainTools(ctx, workspace);

      const middlewares = [
        ...(fallback ? [fallback] : []),
        summarizationMiddleware({
          model: compaction_llm,
          trigger: { tokens: AgentConfig.compaction.threshold_tokens },
          keep: { messages: 20 },
          summaryPrompt: AgentConfig.compaction.prompt,
        }),
      ];

      const agent = createAgent({
        model: llm,
        tools,
        checkpointer,
        systemPrompt: AgentConfig.agent.prompt + ruleTreeSchemaPromptSection,
        ...(middlewares.length > 0 ? { middleware: middlewares } : {}),
      });

      const event_stream = agent.streamEvents(
        {
          messages: turn.user_input
            .map((i) => {
              if (i.source.type === "text") {
                return {
                  role: "user",
                  content: i.source.text,
                };
              }
            })
            .filter((v) => v !== undefined),
        },
        {
          version: "v2",
          recursionLimit: 250,
          configurable: { thread_id: chat_session_id, turn_id },
          signal: abort_signal,
        },
      );

      let fullText = "";

      try {
        for await (const event of event_stream) {
          if (abort_signal?.aborted) {
            wasCancelled = true;
            break;
          }

          if (event.event === "on_chat_model_stream") {
            const chunk = event.data.chunk;
            if (chunk.content) {
              fullText += chunk.content;
              eventBus.publish(turn_id, {
                type: "assistant-delta",
                text: chunk.content,
              });
            }
            const reasoning = (chunk as any).additional_kwargs
              ?.reasoning_content;
            if (reasoning) {
              eventBus.publish(turn_id, {
                type: "reasoning-delta",
                text: reasoning,
              });
            }
          }

          if (event.event === "on_chat_model_end") {
            const usage = event.data.output?.usage_metadata;
            if (usage) {
              totalChatUsage = addUsage(totalChatUsage, {
                input_tokens: usage.input_tokens,
                output_tokens: usage.output_tokens,
              });
            }

            if (fullText.length > 0) {
              await createAndPublishEvent({
                chat_turn_id: turn_id,
                event_type: "assistant-message",
                payload: {
                  type: "assistant-message",
                  content: [
                    { type: "text", source: { type: "text", text: fullText } },
                  ],
                },
              });
              fullText = "";
            }
          }

          if (event.event === "on_tool_start") {
            if (event.name === "web_search") webSearchCount++;
            eventBus.publish(turn_id, {
              type: "tool-input-start",
              text: event.name,
            });
            
            let toolInputContent = event.data.input;
            if (toolInputContent) {
              if (typeof toolInputContent.input === "string") {
                try {
                  toolInputContent = JSON.parse(toolInputContent.input);
                } catch {}
              } else if (typeof toolInputContent === "string") {
                try {
                  toolInputContent = JSON.parse(toolInputContent);
                } catch {}
              }
            }

            await createAndPublishEvent({
              chat_turn_id: turn_id,
              event_type: "tool-input",
              payload: {
                type: "tool-input",
                input: {
                  tool_use_id: event.run_id,
                  label: event.name,
                  content: toolInputContent,
                },
              },
            });
          }

          if (event.event === "on_tool_end") {
            let toolStatus: "success" | "failed" = "success";

            let rawOutput = event.data.output;
            if (
              rawOutput &&
              typeof rawOutput === "object" &&
              "kwargs" in rawOutput
            ) {
              const kwargs = (rawOutput as any).kwargs;
              if (kwargs && "content" in kwargs) {
                rawOutput = kwargs.content;
              }
            }

            let toolContent: any = rawOutput;

            try {
              if (typeof rawOutput === "string") {
                const parsed = JSON.parse(rawOutput);
                toolContent = parsed;
              } else {
                try {
                  toolContent = JSON.parse(rawOutput.content);
                } catch {
                  toolContent = rawOutput.content;
                }
              }

              if (
                toolContent != null &&
                typeof toolContent === "object" &&
                "error" in toolContent
              ) {
                toolStatus = "failed";
                toolContent = { error: AGENT_CHAT_GENERIC_ERROR_MESSAGE };
              }
            } catch {
              // Not a JSON output; leave as is.
            }

            eventBus.publish(turn_id, {
              type: "tool-result",
              output: {
                tool_use_id: event.run_id,
                label: event.name,
                content: toolContent,
                status: toolStatus,
              },
            });
            await createAndPublishEvent({
              chat_turn_id: turn_id,
              event_type: "tool-response",
              payload: {
                type: "tool-result",
                output: {
                  tool_use_id: event.run_id,
                  label: event.name,
                  content: toolContent,
                  status: toolStatus,
                },
              },
            });
          }

          if (event.event === "on_chain_end" && event.name === "LangGraph") {
            // latestStateMessages = event.data.output.messages;
          }
        }
      } catch (error) {
        if (abort_signal?.aborted) {
          wasCancelled = true;
        } else {
          throw error;
        }
      }

      if (wasCancelled) return;



      await createAndPublishEvent({
        chat_turn_id: turn_id,
        event_type: "turn-settled",
        payload: {
          type: "turn-settled",
          status: "completed",
        },
      });
    } catch (error) {
      if (!wasCancelled) {
        logger.error(
          { err: error, chat_turn_id: turn_id },
          "Chat turn execution failed",
        );
        await createAndPublishEvent({
          chat_turn_id: turn_id,
          event_type: "turn-settled",
          payload: {
            type: "turn-settled",
            status: "failed",
            error: AGENT_CHAT_GENERIC_ERROR_MESSAGE,
          },
        });
      }

      throw error;
    } finally {
      try {
        await recordCreditUsage({
          organization_id,
          user_id,
          chat_turn_id: turn_id,
          chat_usage: totalChatUsage,
          compaction_usage: totalCompactionUsage,
          web_search_count: webSearchCount,
        });
      } catch (error) {
        logger.error(
          { err: error, chat_turn_id: turn_id },
          "Failed to record credit usage",
        );
      }
    }
  };

  return {
    createChatTurn: (
      chat_session_id: string,
      input: { user_input: ChatTurnUserInput },
    ) => createChatTurn(ctx, chat_session_id, input),
    executeChatTurn: (
      chat_session_id: string,
      turn_id: string,
      organization_id: string,
      user_id: string,
      workspace: ToolWorkspaceContext,
    ): void => {
      if (runningTurns.has(turn_id)) return;
      runningTurns.add(turn_id);
      const abortController = new AbortController();
      turnAbortControllers.set(turn_id, abortController);

      executeChatTurnInternal({
        chat_session_id,
        turn_id,
        organization_id,
        user_id,
        workspace,
        abort_signal: abortController.signal,
      })
        .catch((error) => {
          logger.error(
            { err: error, chat_session_id, turn_id },
            "Chat turn execution failed",
          );
        })
        .finally(() => {
          runningTurns.delete(turn_id);
          turnAbortControllers.delete(turn_id);
        });
    },
    cancelChatTurn: async (turn_id: string) => {
      cancelledTurns.add(turn_id);

      const controller = turnAbortControllers.get(turn_id);
      if (controller) {
        controller.abort(new Error("Turn cancelled by user"));
        turnAbortControllers.delete(turn_id);
        runningTurns.delete(turn_id);
      }

      await ctx.db
        .updateTable("chat_session_turns")
        .set({ status: "cancelled" })
        .where("id", "=", turn_id)
        .executeTakeFirst();

      await createAndPublishEvent({
        chat_turn_id: turn_id,
        event_type: "turn-settled",
        payload: {
          type: "turn-settled",
          status: "cancelled",
        },
      });

      cancelledTurns.delete(turn_id);
    },
    getTurnStatus: async (turn_id: string) => {
      const turn = await ctx.db
        .selectFrom("chat_session_turns")
        .select(["id", "chat_session_id", "status"])
        .where("id", "=", turn_id)
        .executeTakeFirst();
      if (!turn) {
        throw new AgentOrchestrationException({
          public_message: "Turn not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }
      return turn;
    },
    subscribeToTurn: (
      turn_id: string,
      handler: Parameters<AppContext["eventBus"]["subscribe"]>[1],
    ) => ctx.eventBus.subscribe(turn_id, handler),
  };
};
