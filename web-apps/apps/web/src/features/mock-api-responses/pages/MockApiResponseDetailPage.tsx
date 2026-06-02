import { useParams } from "react-router";

import { MockApiResponseEditor } from "../components/MockApiResponseEditor";
import {
  useMockApiResponse,
  useUpdateMockApiResponse,
} from "../hooks/mock_api_response_hooks";

export function MockApiResponseDetailPage() {
  const { mockApiId, responseId } = useParams();
  const response = useMockApiResponse(mockApiId, responseId);
  const mutation = useUpdateMockApiResponse(mockApiId, responseId);

  if (!mockApiId || !responseId) {
    return <main className="page-content">Missing ID.</main>;
  }

  return (
    <main className="nested-workspace-canvas">
      {response.isPending && <p>Loading response...</p>}
      {response.isError && <p className="error">{response.error.message}</p>}
      {response.data && (
        <MockApiResponseEditor
          mockApiId={mockApiId}
          initialResponse={response.data}
          submitLabel="Save response"
          isPending={mutation.isPending}
          errorMessage={mutation.error?.message}
          onSubmit={(input) => mutation.mutate(input)}
        />
      )}
    </main>
  );
}
