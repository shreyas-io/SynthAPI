export type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  score?: number;
};

export type WebSearchResponse = {
  query: string;
  results: WebSearchResult[];
};

export interface IWebSearchProvider {
  search(query: string, options?: { limit?: number }): Promise<WebSearchResponse>;
}
