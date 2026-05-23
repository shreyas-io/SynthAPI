export type ChatSessionEt = {
  id: string;
  agent_config_id: string;
  status: "active" | "archived";
  created_at: Date;
  updated_at: Date;
};
