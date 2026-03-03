import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import CreateProjectPage from "@/pages/CreateProjectPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import ChapterLearningPage from "@/pages/ChapterLearningPage";
import ChapterAssessmentPage from "@/pages/ChapterAssessmentPage";
import SettingsPage from "@/pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects/new" element={<CreateProjectPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/chapters/:id" element={<ChapterLearningPage />} />
        <Route
          path="/chapters/:id/assessment"
          element={<ChapterAssessmentPage />}
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
