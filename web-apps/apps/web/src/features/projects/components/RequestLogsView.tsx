import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MethodPill } from "../../../components/atoms/MethodPill";
import { Button } from "../../../components/atoms/Button";
import { useProjectRequestLogs } from "../hooks/project_hooks";

export function RequestLogsView({
  projectId,
  mockApiId,
}: {
  projectId: string;
  mockApiId?: string;
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useProjectRequestLogs(projectId, mockApiId);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (isLoading) return <p>Loading logs...</p>;
  if (isError) return <p className="error">{error?.message}</p>;

  const logs = data?.pages.flatMap((page) => page.records) ?? [];

  if (logs.length === 0) {
    return <p className="muted-text">No request logs found.</p>;
  }

  return (
    <div className="request-logs-container">
      <div className="request-logs-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {logs.map((log) => {
          const isExpanded = expandedLogId === log.id;
          return (
            <div key={log.id} className="card" style={{ cursor: "pointer" }} onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  <MethodPill method={log.method} />
                  <code style={{ wordBreak: "break-all" }}>{log.url}</code>
                  <span style={{ color: log.response_status >= 400 ? "var(--color-danger)" : "var(--color-success)", fontWeight: 600 }}>
                    {log.response_status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                  <span className="muted-text">{new Date(log.created_at).toLocaleString()}</span>
                  <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: 'var(--color-text-secondary)' }} />
                </div>
              </div>
              
              {isExpanded && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "1rem" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <p className="eyebrow">Request Headers</p>
                      <pre style={{ overflowX: 'auto' }}><code>{typeof log.request_headers === "string" ? log.request_headers : JSON.stringify(log.request_headers, null, 2)}</code></pre>
                    </div>
                    {log.request_body !== null && log.request_body !== undefined && (
                      <div>
                        <p className="eyebrow">Request Body</p>
                        <pre style={{ overflowX: 'auto' }}><code>{typeof log.request_body === "string" ? log.request_body : JSON.stringify(log.request_body, null, 2)}</code></pre>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <p className="eyebrow">Response Headers</p>
                      <pre style={{ overflowX: 'auto' }}><code>{typeof log.response_headers === "string" ? log.response_headers : JSON.stringify(log.response_headers, null, 2)}</code></pre>
                    </div>
                    {log.response_body !== null && log.response_body !== undefined && (
                      <div>
                        <p className="eyebrow">Response Body</p>
                        <pre style={{ overflowX: 'auto' }}><code>{typeof log.response_body === "string" ? log.response_body : JSON.stringify(log.response_body, null, 2)}</code></pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasNextPage && (
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading more..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
