import { useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { MockApiResponsePane } from "../../mock-apis/components/MockApiResponsePane";
import { createMockApiResponse } from "../api/mock_api_responses_api";
import { MockApiResponseEditor } from "../components/MockApiResponseEditor";

export function NewMockApiResponsePage() {
  const { mockApiId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createMockApiResponse>[1]) => {
      if (!mockApiId) throw new Error("Missing mock API ID");
      return createMockApiResponse(mockApiId, input);
    },
    async onSuccess(response) {
      if (mockApiId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.mockApiResponses(mockApiId),
        });
      }
      navigate(`/mock-apis/${response.mock_api_id}`);
    },
  });

  if (!mockApiId) {
    return <main className="page">Missing mock API ID.</main>;
  }

  return (
    <main className="page mock-api-workspace">
      <MockApiResponsePane mockApiId={mockApiId} />
      <section>
        <MockApiResponseEditor
          mockApiId={mockApiId}
          submitLabel="Create response"
          isPending={mutation.isPending}
          errorMessage={mutation.isError ? mutation.error.message : undefined}
          onSubmit={(input) => mutation.mutate(input)}
        />
      </section>
    </main>
  );
}
