// frontend/src/App.jsx (v3)
// Routes: admin sidebar layout, teacher modules flow, student modules flow.
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/AdminLayout.jsx';

// Public
import Home from './pages/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';

// Super Admin
import SuperDashboard from './pages/super/SuperDashboard.jsx';
import TeachersList from './pages/super/TeachersList.jsx';
import TeacherStudents from './pages/super/TeacherStudents.jsx';
import StudentsList from './pages/super/StudentsList.jsx';
import SubjectsAdmin from './pages/super/SubjectsAdmin.jsx';
import AccessCodesAdmin from './pages/super/AccessCodesAdmin.jsx';
import LogsList from './pages/super/LogsList.jsx';

// Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import TeacherProfile from './pages/teacher/TeacherProfile.jsx';
import MyTeacherStudents from './pages/teacher/TeacherStudents.jsx';
import SubjectModules from './pages/teacher/SubjectModules.jsx';
import ModuleDetail from './pages/teacher/ModuleDetail.jsx';
import QuizBuilder from './pages/teacher/QuizBuilder.jsx';
import QuizResults from './pages/teacher/QuizResults.jsx';

// Student
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentModules from './pages/student/StudentModules.jsx';
import StudentModuleDetail from './pages/student/StudentModuleDetail.jsx';
import StudentQuiz from './pages/student/StudentQuiz.jsx';
import StudentQuizResult from './pages/student/StudentQuizResult.jsx';
import StudentQuizHistory from './pages/student/StudentQuizHistory.jsx';
import StudentProgress from './pages/student/StudentProgress.jsx';

export default function App() {
  const location = useLocation();
  const showNavbar = !location.pathname.startsWith('/super');

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Super Admin (sidebar layout) */}
        <Route
          path="/super"
          element={
            <ProtectedRoute roles={['super']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperDashboard />} />
          <Route path="teachers" element={<TeachersList />} />
          <Route path="teachers/:id/students" element={<TeacherStudents />} />
          <Route path="students" element={<StudentsList />} />
          <Route path="subjects" element={<SubjectsAdmin />} />
          <Route path="access-codes" element={<AccessCodesAdmin />} />
          <Route path="logs" element={<LogsList />} />
        </Route>

        {/* Teacher */}
        <Route path="/teacher" element={
          <ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>
        } />
        <Route path="/teacher/profile" element={
          <ProtectedRoute roles={['teacher']}><TeacherProfile /></ProtectedRoute>
        } />
        <Route path="/teacher/my-students" element={
          <ProtectedRoute roles={['teacher']}><MyTeacherStudents /></ProtectedRoute>
        } />
        <Route path="/teacher/subjects/:id/modules" element={
          <ProtectedRoute roles={['teacher']}><SubjectModules /></ProtectedRoute>
        } />
        <Route path="/teacher/modules/:id" element={
          <ProtectedRoute roles={['teacher']}><ModuleDetail /></ProtectedRoute>
        } />
        <Route path="/teacher/modules/:moduleId/quiz/new" element={
          <ProtectedRoute roles={['teacher']}><QuizBuilder /></ProtectedRoute>
        } />
        <Route path="/teacher/quizzes/:quizId/edit" element={
          <ProtectedRoute roles={['teacher']}><QuizBuilder /></ProtectedRoute>
        } />
        <Route path="/teacher/quizzes/:quizId/results" element={
          <ProtectedRoute roles={['teacher']}><QuizResults /></ProtectedRoute>
        } />

        {/* Student */}
        <Route path="/student" element={
          <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
        } />
        <Route path="/student/progress" element={
          <ProtectedRoute roles={['student']}><StudentProgress /></ProtectedRoute>
        } />
        <Route path="/student/subjects/:id/modules" element={
          <ProtectedRoute roles={['student']}><StudentModules /></ProtectedRoute>
        } />
        <Route path="/student/modules/:id" element={
          <ProtectedRoute roles={['student']}><StudentModuleDetail /></ProtectedRoute>
        } />
        <Route path="/student/quizzes/:quizId" element={
          <ProtectedRoute roles={['student']}><StudentQuiz /></ProtectedRoute>
        } />
        <Route path="/student/quizzes/:quizId/attempts/:attemptId" element={
          <ProtectedRoute roles={['student']}><StudentQuizResult /></ProtectedRoute>
        } />
        <Route path="/student/quizzes/:quizId/history" element={
          <ProtectedRoute roles={['student']}><StudentQuizHistory /></ProtectedRoute>
        } />

        <Route path="*" element={
          <div className="max-w-7xl mx-auto p-8">
            <h2 className="text-2xl font-bold">Page introuvable</h2>
          </div>
        } />
      </Routes>
    </>
  );
}
