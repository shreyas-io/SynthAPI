import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { listMockApiResponses } from "../../mock-api-responses/api/mock_api_responses_api";
import { getMockApi } from "../api/mock_apis_api";

export function MockApiDetailPage() {
  const { mockApiId } = useParams();

  if (!mockApiId) {
    return <main className="page">Missing mock API ID.</main>;
  }

  const mockApi = useQuery({
    queryKey: queryKeys.mockApi(mockApiId),
    queryFn: () => getMockApi(mockApiId),
  });
  const responses = useQuery({
    queryKey: queryKeys.mockApiResponses(mockApiId),
    queryFn: () => listMockApiResponses(mockApiId),
  });

  return (
    <main className="page">
      {mockApi.data && (
        <header className="page-header">
          <div>
            <p className="eyebrow">
              {mockApi.data.method} {mockApi.data.path}
            </p>
            <h1>{mockApi.data.name}</h1>
            <p>{mockApi.data.description}</p>
          </div>
          <Link className="button" to={`/mock-apis/${mockApiId}/responses/new`}>
            New response
          </Link>
        </header>
      )}

      {responses.isPending && <p>Loading responses...</p>}
      {responses.isError && <p className="error">{responses.error.message}</p>}
      {responses.data && (
        <section className="grid">
          {responses.data.records.map((response) => (
            <Link
              className="card link-card"
              to={`/mock-apis/${mockApiId}/responses/${response.id}`}
              key={response.id}
            >
              {response.is_default && <span className="pill">Default</span>}
              <h2>{response.name}</h2>
              <p>{response.id}</p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
