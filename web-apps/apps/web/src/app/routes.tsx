import { Navigate, Route, Routes } from "react-router";

import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { SigninPage } from "../features/auth/pages/SigninPage";
import { SignupPage } from "../features/auth/pages/SignupPage";
import { MockApiResponseDetailPage } from "../features/mock-api-responses/pages/MockApiResponseDetailPage";
import { NewMockApiResponsePage } from "../features/mock-api-responses/pages/NewMockApiResponsePage";
import { MockApiDetailPage } from "../features/mock-apis/pages/MockApiDetailPage";
import { NewMockApiPage } from "../features/mock-apis/pages/NewMockApiPage";
import { NewProjectPage } from "../features/projects/pages/NewProjectPage";
import { ProjectDetailPage } from "../features/projects/pages/ProjectDetailPage";
import { ProjectsPage } from "../features/projects/pages/ProjectsPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProjectWorkspaceLayout } from "./layouts/ProjectWorkspaceLayout";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SigninPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          
          <Route path="/projects/:projectId" element={<ProjectWorkspaceLayout />}>
            <Route index element={<ProjectDetailPage />} />
            <Route path="mock-apis/new" element={<NewMockApiPage />} />
            <Route path="mock-apis/:mockApiId" element={<MockApiDetailPage />}>
               <Route
                 path="responses/new"
                 element={<NewMockApiResponsePage />}
               />
               <Route
                 path="responses/:responseId"
                 element={<MockApiResponseDetailPage />}
               />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}