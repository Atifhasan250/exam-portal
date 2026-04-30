import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ExamsPage from './pages/ExamsPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminExamView from './pages/AdminExamView'
import ExamPage from './pages/ExamPage'
import Leaderboard from './pages/Leaderboard'
import ProfilePage from './pages/ProfilePage'
import SubmissionDetails from './pages/SubmissionDetails'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token')
  if (!token) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  return (
    <div className="flex flex-col min-h-screen bg-theme-bg text-theme-primary transition-theme">
      <div className="flex-grow">
        <Routes>
          <Route path="/"               element={<HomePage />} />
          <Route path="/exams"          element={<ExamsPage />} />
          <Route path="/exam/:id"       element={<ExamPage />} />
          <Route path="/leaderboard"    element={<Leaderboard />} />
          <Route path="/leaderboard/:id" element={<Leaderboard />} />
          <Route path="/profile"        element={<ProfilePage />} />
          <Route path="/profile/submission/:id" element={<SubmissionDetails />} />
          <Route path="/admin"          element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/exam/:id" element={
            <ProtectedRoute><AdminExamView /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <footer className="text-center py-6 text-sm text-theme-secondary border-t border-theme-border/50 bg-theme-surface mt-auto">
        &copy; 2026 IT Resource Zone | Made by <a href="https://atifs-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-bold text-theme-primary hover:text-theme-accent transition-colors underline">Atif Hasan</a>
      </footer>
    </div>
  )
}
