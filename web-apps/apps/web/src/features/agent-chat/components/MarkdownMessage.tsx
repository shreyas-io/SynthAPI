import { Fragment, ReactNode } from "react";

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language: string | null; code: string }
  | { type: "quote"; text: string };

const parseBlocks = (markdown: string): Block[] => {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      index++;
      continue;
    }

    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "");
        index++;
      }
      if (index < lines.length) {
        index++;
      }
      blocks.push({
        type: "code",
        language: fence[1] ?? null,
        code: codeLines.join("\n"),
      });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading?.[1] && heading[2]) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      index++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index++;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    const unorderedList = line.match(/^[-*]\s+(.+)$/);
    const orderedList = line.match(/^\d+\.\s+(.+)$/);
    if (unorderedList || orderedList) {
      const ordered = Boolean(orderedList);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? "";
        const match = ordered
          ? current.match(/^\d+\.\s+(.+)$/)
          : current.match(/^[-*]\s+(.+)$/);
        if (!match) {
          break;
        }
        items.push(match[1] ?? "");
        index++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !/^```/.test(lines[index] ?? "") &&
      !/^(#{1,3})\s+/.test(lines[index] ?? "") &&
      !/^>\s?/.test(lines[index] ?? "") &&
      !/^[-*]\s+/.test(lines[index] ?? "") &&
      !/^\d+\.\s+/.test(lines[index] ?? "")
    ) {
      paragraphLines.push(lines[index] ?? "");
      index++;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
};

const parseInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a
          href={match[3]}
          key={match.index}
          rel="noreferrer"
          target="_blank"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(<code key={match.index}>{match[4]}</code>);
    } else if (match[5]) {
      nodes.push(<strong key={match.index}>{match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<em key={match.index}>{match[6]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

export function MarkdownMessage({ markdown }: { markdown: string }) {
  return (
    <div className="agent-markdown">
      {parseBlocks(markdown).map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Heading = `h${block.level}` as const;
            return <Heading key={index}>{parseInline(block.text)}</Heading>;
          }
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{parseInline(item)}</li>
                ))}
              </List>
            );
          }
          case "code":
            return (
              <pre className="agent-markdown-code" key={index}>
                {block.language && <span>{block.language}</span>}
                <code>{block.code}</code>
              </pre>
            );
          case "quote":
            return (
              <blockquote key={index}>
                {block.text.split("\n").map((line, lineIndex) => (
                  <Fragment key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {parseInline(line)}
                  </Fragment>
                ))}
              </blockquote>
            );
          case "paragraph":
            return (
              <p key={index}>
                {block.text.split("\n").map((line, lineIndex) => (
                  <Fragment key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {parseInline(line)}
                  </Fragment>
                ))}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
