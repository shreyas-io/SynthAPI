import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import {
  getMockApiResponse,
  updateMockApiResponse,
} from "../api/mock_api_responses_api";
import { MockApiResponseEditor } from "../components/MockApiResponseEditor";
import { MockApiResponsePane } from "../../mock-apis/components/MockApiResponsePane";

export function MockApiResponseDetailPage() {
  const { mockApiId, responseId } = useParams();
  const queryClient = useQueryClient();

  if (!mockApiId || !responseId) {
    return <main className="page">Missing response ID.</main>;
  }

  const response = useQuery({
    queryKey: queryKeys.mockApiResponse(mockApiId, responseId),
    queryFn: () => getMockApiResponse(mockApiId, responseId),
  });
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof updateMockApiResponse>[2]) =>
      updateMockApiResponse(mockApiId, responseId, input),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.mockApiResponse(mockApiId, responseId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.mockApiResponses(mockApiId),
        }),
      ]);
    },
  });

  return (
    <main className="page mock-api-workspace">
      <MockApiResponsePane
        mockApiId={mockApiId}
        activeResponseId={responseId}
      />
      <section>
        {response.isPending && <p>Loading response...</p>}
        {response.isError && <p className="error">{response.error.message}</p>}
        {response.data && (
          <MockApiResponseEditor
            mockApiId={mockApiId}
            initialResponse={response.data}
            submitLabel="Save response"
            isPending={mutation.isPending}
            errorMessage={mutation.isError ? mutation.error.message : undefined}
            onSubmit={(input) => mutation.mutate(input)}
          />
        )}
      </section>
    </main>
  );
}
