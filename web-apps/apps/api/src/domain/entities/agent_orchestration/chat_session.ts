export type ChatSessionEt = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: Date;
  updated_at: Date;
};
