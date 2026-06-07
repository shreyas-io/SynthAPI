import type { ColumnType } from "kysely";

import type { AgentConfigsTable } from "./agent_orchestration/agent_configs";
import type { ChatSessionTurnsTable } from "./agent_orchestration/chat_session_turns";
import type { ChatSessionsTable } from "./agent_orchestration/chat_sessions";
import type { ChatTurnBlobsTable } from "./agent_orchestration/chat_turn_blobs";
import type { ChatTurnEventsTable } from "./agent_orchestration/chat_turn_events";
import type { MockApiResponsesTable } from "./mock_api_responses";
import type { MockApisTable } from "./mock_apis";
import type {
  OrganizationCreditGrantsTable,
  OrganizationCreditUsagesTable,
  OrganizationMembershipsTable,
  OrganizationPlanSubscriptionsTable,
  OrganizationsTable,
  PlanTypesTable,
} from "./organizations";
import type { ProjectsTable } from "./projects";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type UsersTable = {
  id: ColumnType<string, string | undefined, never>;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AuthIdentitiesTable = {
  id: ColumnType<string, string | undefined, never>;
  provider: string;
  provider_subject: string;
  user_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AuthorizedSessionsTable = {
  id: ColumnType<string, string | undefined, never>;
  user_id: string;
  token_prefix: string;
  token_suffix: string;
  token_hash: string;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Database = {
  users: UsersTable;
  auth_identities: AuthIdentitiesTable;
  authorized_sessions: AuthorizedSessionsTable;
  organizations: OrganizationsTable;
  organization_memberships: OrganizationMembershipsTable;
  plan_types: PlanTypesTable;
  organization_plan_subscriptions: OrganizationPlanSubscriptionsTable;
  organization_credit_grants: OrganizationCreditGrantsTable;
  organization_credit_usages: OrganizationCreditUsagesTable;
  projects: ProjectsTable;
  mock_apis: MockApisTable;
  mock_api_responses: MockApiResponsesTable;
  agent_configs: AgentConfigsTable;
  chat_sessions: ChatSessionsTable;
  chat_turn_blobs: ChatTurnBlobsTable;
  chat_session_turns: ChatSessionTurnsTable;
  chat_turn_events: ChatTurnEventsTable;
};
