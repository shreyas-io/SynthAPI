import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { getMockApiResponse } from "../api/mock_api_responses_api";

export function MockApiResponseDetailPage() {
  const { mockApiId, responseId } = useParams();

  if (!mockApiId || !responseId) {
    return <main className="page">Missing response ID.</main>;
  }

  const response = useQuery({
    queryKey: queryKeys.mockApiResponse(mockApiId, responseId),
    queryFn: () => getMockApiResponse(mockApiId, responseId),
  });

  return (
    <main className="page">
      {response.isPending && <p>Loading response...</p>}
      {response.isError && <p className="error">{response.error.message}</p>}
      {response.data && (
        <section className="card">
          <p className="eyebrow">
            {response.data.is_default ? "Default response" : "Rule response"}
          </p>
          <h1>{response.data.name}</h1>
          <pre>{JSON.stringify(response.data, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
