import { Link } from "react-router";

import { useMockApiResponses } from "../../mock-api-responses/hooks/mock_api_response_hooks";
import { useMockApi } from "../hooks/mock_api_hooks";

export function MockApiResponsePane({
  mockApiId,
  activeResponseId,
}: {
  mockApiId: string;
  activeResponseId?: string;
}) {
  const mockApi = useMockApi(mockApiId);
  const responses = useMockApiResponses(mockApiId);

  return (
    <aside className="mock-api-left-pane card">
      {mockApi.data && (
        <section className="route-summary">
          <p className="eyebrow">Route</p>
          <h2>{mockApi.data.name}</h2>
          <p>
            <span className="pill">{mockApi.data.method}</span>{" "}
            <code>{mockApi.data.path}</code>
          </p>
          {mockApi.data.description && <p>{mockApi.data.description}</p>}
        </section>
      )}

      <section className="response-list-pane">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Responses</p>
            <h3>Configured responses</h3>
          </div>
          <Link className="button" to={`/mock-apis/${mockApiId}/responses/new`}>
            New
          </Link>
        </div>
        {responses.isPending && <p>Loading responses...</p>}
        {responses.isError && <p className="error">{responses.error.message}</p>}
        {responses.data?.records.map((response) => (
          <Link
            className={`response-list-item ${
              response.id === activeResponseId ? "active" : ""
            }`}
            to={`/mock-apis/${mockApiId}/responses/${response.id}`}
            key={response.id}
          >
            <span>{response.name}</span>
            {response.is_default && <span className="pill">Default</span>}
          </Link>
        ))}
        {responses.data?.records.length === 0 && (
          <p>No responses configured yet.</p>
        )}
      </section>
    </aside>
  );
}
