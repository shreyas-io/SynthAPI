import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { queryKeys } from "../../../shared/api/query_keys";
import { createMockApiResponse } from "../api/mock_api_responses_api";
import { MockApiResponseEditor } from "../components/MockApiResponseEditor";

export function NewMockApiResponsePage() {
  const { projectId, mockApiId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: any) => createMockApiResponse(mockApiId!, input),
    async onSuccess(response) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId!),
      });
      navigate(`/projects/${projectId}/mock-apis/${mockApiId}/responses/${response.id}`);
    },
  });

  if (!mockApiId || !projectId) {
    return <main className="page-content">Missing ID.</main>;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <MockApiResponseEditor
        mockApiId={mockApiId}
        submitLabel="Create response"
        isPending={mutation.isPending}
        errorMessage={mutation.error?.message}
        onSubmit={(input) => mutation.mutate({ ...input, mock_api_id: mockApiId })}
      />
    </div>
  );
}