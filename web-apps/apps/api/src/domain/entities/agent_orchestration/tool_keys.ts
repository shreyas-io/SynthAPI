export const toolKeys = [
  "list_projects",
  "get_project",
  "update_project_globals",
  "update_project_constants",
  "list_mock_apis",
  "get_mock_api",
  "create_mock_api",
  "update_mock_api",
  "list_mock_api_responses",
  "get_mock_api_response",
  "create_mock_api_response",
  "update_mock_api_response",
  "reorder_mock_api_responses",
  "render_ui_form",
  "web_search",
  "web_scrape",
] as const;

export type ToolKey = (typeof toolKeys)[number];
