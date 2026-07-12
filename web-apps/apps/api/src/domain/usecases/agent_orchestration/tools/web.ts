import { lookup } from "node:dns/promises";
import net from "node:net";
import { toolDefinitions } from "./definitions";
import { webScrapeToolInputDto, webSearchToolInputDto } from "./schemas";
import type { ITool } from "./types";

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  score?: number;
};

const USER_AGENT =
  "SynthAPI-Agent/1.0 (+https://synthapi.local; web search and scrape tool)";
const MAX_HTML_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const decodeHtml = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const stripTags = (html: string): string =>
  decodeHtml(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split(".").map(Number);
  const [a, b] = parts;
  if (parts.length !== 4 || a === undefined || b === undefined) return true;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
};

const isPrivateIp = (ip: string): boolean => {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (!net.isIPv6(ip)) return true;

  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
};

const assertPublicHttpUrl = async (rawUrl: string): Promise<URL> => {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not supported.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname))
      throw new Error("Private IP URLs are not supported.");
    return url;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some((address) => isPrivateIp(address.address))
  ) {
    throw new Error(
      "URLs resolving to private network addresses are not supported.",
    );
  }

  return url;
};

const fetchText = async (
  rawUrl: string,
): Promise<{ url: string; html: string }> => {
  let currentUrl = await assertPublicHttpUrl(rawUrl);

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const response = await fetch(currentUrl, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location)
        throw new Error("Redirect response did not include a location.");
      currentUrl = await assertPublicHttpUrl(
        new URL(location, currentUrl).toString(),
      );
      continue;
    }

    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}.`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_HTML_BYTES) {
      throw new Error("Page is too large to scrape.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)
    ) {
      throw new Error(`Unsupported content type: ${contentType}.`);
    }

    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      throw new Error("Page is too large to scrape.");
    }

    return { url: currentUrl.toString(), html };
  }

  throw new Error("Too many redirects.");
};

const htmlToMarkdown = (html: string, maxChars: number): string => {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  let markdown = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|style|noscript|svg|canvas|iframe)[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n")
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_, href, text) => {
        const label = stripTags(text);
        return label ? `[${label}](${decodeHtml(href)})` : "";
      },
    )
    .replace(
      /<\/(p|div|section|article|main|header|footer|blockquote|ul|ol|table|tr)>/gi,
      "\n",
    )
    .replace(/<[^>]*>/g, " ");

  markdown = decodeHtml(markdown)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const decodedTitle = title ? stripTags(title) : "";
  const withTitle =
    decodedTitle && !markdown.startsWith("# ")
      ? `# ${decodedTitle}\n\n${markdown}`
      : markdown;

  return withTitle.length > maxChars
    ? `${withTitle.slice(0, maxChars).trim()}\n\n[Content truncated]`
    : withTitle;
};

export const webTools = {
  web_search: {
    definition: toolDefinitions.web_search,
    async execute(ctx, _workspace, input) {
      const parsed = webSearchToolInputDto.parse(input);
      const response = await ctx.webSearchProvider.search(parsed.query, { limit: parsed.limit });
      return response;
    },
  },
  web_scrape: {
    definition: toolDefinitions.web_scrape,
    async execute(_ctx, _workspace, input) {
      const parsed = webScrapeToolInputDto.parse(input);
      const { url, html } = await fetchText(parsed.url);

      return {
        url,
        markdown: htmlToMarkdown(html, parsed.max_chars),
      };
    },
  },
} satisfies Pick<Record<string, ITool>, "web_search" | "web_scrape">;
