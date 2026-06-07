import { useNavigate, useParams } from "react-router";

import { MockApiResponseEditor } from "../components/MockApiResponseEditor";
import {
  useDeleteMockApiResponse,
  useMockApiResponse,
  useUpdateMockApiResponse,
} from "../hooks/mock_api_response_hooks";

export function MockApiResponseDetailPage() {
  const { projectId, mockApiId, responseId } = useParams();
  const navigate = useNavigate();
  const response = useMockApiResponse(mockApiId, responseId);
  const mutation = useUpdateMockApiResponse(mockApiId, responseId);
  const deleteMutation = useDeleteMockApiResponse(mockApiId, responseId);

  if (!projectId || !mockApiId || !responseId) {
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
          isDeleting={deleteMutation.isPending}
          deleteErrorMessage={deleteMutation.error?.message}
          onSubmit={(input) => mutation.mutate(input)}
          onDelete={() => {
            if (!confirm(`Delete response "${response.data.name}"?`)) return;

            deleteMutation.mutate(undefined, {
              onSuccess() {
                navigate(`/projects/${projectId}/mock-apis/${mockApiId}`);
              },
            });
          }}
        />
      )}
    </main>
  );
}
