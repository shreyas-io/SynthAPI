export type ProjectApiKeyEt = {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  key_suffix: string;
  created_by_user_id: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CreatedProjectApiKeyEt = ProjectApiKeyEt & {
  api_key: string;
};
