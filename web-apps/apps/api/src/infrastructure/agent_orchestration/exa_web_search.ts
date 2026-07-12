import type {
  IWebSearchProvider,
  WebSearchResponse,
} from "../../domain/interfaces/agent_orchestration/web_search";

export class ExaWebSearchProvider implements IWebSearchProvider {
  constructor(private readonly apiKey?: string) {}

  async search(
    query: string,
    options?: { limit?: number },
  ): Promise<WebSearchResponse> {
    if (!this.apiKey) {
      throw new Error("Web search is currently unavailable (EXA_API_KEY missing).");
    }

    // Strict cap of 10 results
    const numResults = Math.min(options?.limit ?? 10, 10);

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        query,
        numResults,
        contents: {
          text: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Exa search failed with HTTP ${response.status}.`);
    }

    const data = (await response.json()) as any;

    const results = (data.results ?? []).map((r: any) => ({
      title: r.title || "Untitled",
      url: r.url,
      snippet: r.text,
      score: r.score,
    }));

    return {
      query,
      results,
    };
  }
}
