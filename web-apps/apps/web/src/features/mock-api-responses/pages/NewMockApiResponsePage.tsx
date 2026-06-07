import { useNavigate, useParams } from "react-router";

import { MockApiResponseEditor } from "../components/MockApiResponseEditor";
import { useCreateMockApiResponse } from "../hooks/mock_api_response_hooks";

export function NewMockApiResponsePage() {
  const { projectId, mockApiId } = useParams();
  const navigate = useNavigate();
  const mutation = useCreateMockApiResponse(mockApiId);

  if (!mockApiId || !projectId) {
    return <main className="page-content">Missing ID.</main>;
  }

  return (
    <main className="nested-workspace-canvas">
      <MockApiResponseEditor
        mockApiId={mockApiId}
        submitLabel="Create response"
        isPending={mutation.isPending}
        errorMessage={mutation.error?.message}
        onSubmit={(input) =>
          mutation.mutate(input, {
            onSuccess(response) {
              navigate(
                `/projects/${projectId}/mock-apis/${mockApiId}/responses/${response.id}`,
              );
            },
          })
        }
      />
    </main>
  );
}
