export type ChatSessionEt = {
  id: string;
  agent_config_id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: Date;
  updated_at: Date;
};
