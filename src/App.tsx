import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DesktopLayout } from "./components/layout/DesktopLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { MaterialPage } from "./pages/MaterialPage";
import { AssessmentPage } from "./pages/AssessmentPage";
import { CalendarPage } from "./pages/CalendarPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LLMConfigPage } from "./pages/LLMConfigPage";
import { ProfilePage } from "./pages/ProfilePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DesktopLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="create" element={<CreateProjectPage />} />
          <Route path="project/:projectId" element={<ProjectDetailPage />} />
          <Route path="project/:projectId/chapter/:chapterId/material" element={<MaterialPage />} />
          <Route path="project/:projectId/chapter/:chapterId/assessment" element={<AssessmentPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/llm" element={<LLMConfigPage />} />
          <Route path="settings/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
