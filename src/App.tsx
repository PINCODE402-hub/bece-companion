import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { SyncProvider } from "@/offline/syncEngine";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { LoginPage } from "@/auth/LoginPage";
import { RegisterPage } from "@/auth/RegisterPage";
import { ForgotPasswordPage } from "@/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/auth/ResetPasswordPage";
import { HomePage } from "@/pages/HomePage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AdminLayout } from "@/admin/AdminLayout";
import { AdminDashboard } from "@/admin/AdminDashboard";
import { AdminYears } from "@/admin/AdminYears";
import { AdminSubjects } from "@/admin/AdminSubjects";
import { AdminPapers } from "@/admin/AdminPapers";
import { AdminPaperDetail } from "@/admin/AdminPaperDetail";
import { AdminQuestionEditor } from "@/admin/AdminQuestionEditor";
import { AdminImporter } from "@/admin/AdminImporter";
import { AdminAnswerReview } from "@/admin/AdminAnswerReview";
import { AdminReports } from "@/admin/AdminReports";
import { AdminExport } from "@/admin/AdminExport";
import { PastQuestionsYears } from "@/pastquestions/PastQuestionsYears";
import { PastQuestionsSubjects } from "@/pastquestions/PastQuestionsSubjects";
import { PastQuestionsPapers } from "@/pastquestions/PastQuestionsPapers";
import { PastQuestionsSession } from "@/pastquestions/PastQuestionsSession";
import { MockExamSession } from "@/pastquestions/MockExamSession";
import { GamesHub } from "@/games/GamesHub";
import { SpeedRoundGame } from "@/games/SpeedRoundGame";
import { TermMatchGame } from "@/games/TermMatchGame";
import { WordScrambleGame } from "@/games/WordScrambleGame";
import { SpinQuizGame } from "@/games/SpinQuizGame";
import { StreakBlasterGame } from "@/games/StreakBlasterGame";
import { ShootingGalleryGame } from "@/games/ShootingGalleryGame";
import { RacingRivalsGame } from "@/games/RacingRivalsGame";
import { AntTyperGame } from "@/games/AntTyperGame";
import { ProgressPage } from "@/progress/ProgressPage";
import { MistakesPage } from "@/progress/MistakesPage";
import { BookmarksPage } from "@/progress/BookmarksPage";
import { LeaderboardPage } from "@/progress/LeaderboardPage";
import { BadgesPage } from "@/progress/BadgesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
        <SyncStatusBadge />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/past-questions"
            element={
              <ProtectedRoute>
                <PastQuestionsYears />
              </ProtectedRoute>
            }
          />
          <Route
            path="/past-questions/:year"
            element={
              <ProtectedRoute>
                <PastQuestionsSubjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/past-questions/:year/:subjectId"
            element={
              <ProtectedRoute>
                <PastQuestionsPapers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/past-questions/:year/:subjectId/:paperId"
            element={
              <ProtectedRoute>
                <PastQuestionsSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/past-questions/:year/:subjectId/:paperId/exam"
            element={
              <ProtectedRoute>
                <MockExamSession />
              </ProtectedRoute>
            }
          />

          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <ProgressPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress/mistakes"
            element={
              <ProtectedRoute>
                <MistakesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress/bookmarks"
            element={
              <ProtectedRoute>
                <BookmarksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress/badges"
            element={
              <ProtectedRoute>
                <BadgesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <GamesHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/speed"
            element={
              <ProtectedRoute>
                <SpeedRoundGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/match"
            element={
              <ProtectedRoute>
                <TermMatchGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/scramble"
            element={
              <ProtectedRoute>
                <WordScrambleGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/spin"
            element={
              <ProtectedRoute>
                <SpinQuizGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/streak"
            element={
              <ProtectedRoute>
                <StreakBlasterGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/shoot"
            element={
              <ProtectedRoute>
                <ShootingGalleryGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/race"
            element={
              <ProtectedRoute>
                <RacingRivalsGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/ant"
            element={
              <ProtectedRoute>
                <AntTyperGame />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="years" element={<AdminYears />} />
            <Route path="subjects" element={<AdminSubjects />} />
            <Route path="papers" element={<AdminPapers />} />
            <Route path="papers/:paperId" element={<AdminPaperDetail />} />
            <Route path="papers/:paperId/import" element={<AdminImporter />} />
            <Route path="papers/:paperId/questions/new" element={<AdminQuestionEditor />} />
            <Route path="papers/:paperId/questions/:questionId" element={<AdminQuestionEditor />} />
            <Route path="review" element={<AdminAnswerReview />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="export" element={<AdminExport />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

