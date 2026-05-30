import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";

import { queryKeys } from "../../../shared/api/query_keys";
import {
  getMockApiResponse,
  updateMockApiResponse,
} from "../api/mock_api_responses_api";
import { MockApiResponseEditor } from "../components/MockApiResponseEditor";

export function MockApiResponseDetailPage() {
  const { mockApiId, responseId } = useParams();
  const queryClient = useQueryClient();

  const response = useQuery({
    queryKey: queryKeys.mockApiResponse(mockApiId!, responseId!),
    enabled: Boolean(mockApiId && responseId),
    queryFn: () => getMockApiResponse(mockApiId!, responseId!),
  });

  const mutation = useMutation({
    mutationFn: (args: any) => updateMockApiResponse(mockApiId!, args.id, args.response),
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponse(mockApiId!, responseId!),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId!),
      });
    },
  });

  if (!mockApiId || !responseId) {
    return <main className="page-content">Missing ID.</main>;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {response.isPending && <p>Loading response...</p>}
      {response.isError && <p className="error">{response.error.message}</p>}
      {response.data && (
        <MockApiResponseEditor
          mockApiId={mockApiId}
          initialResponse={response.data}
          submitLabel="Save response"
          isPending={mutation.isPending}
          errorMessage={mutation.error?.message}
          onSubmit={(input) =>
            mutation.mutate({
              id: responseId,
              response: { ...input, mock_api_id: mockApiId },
            })
          }
        />
      )}
    </div>
  );
}