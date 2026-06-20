import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';

import Navbar       from './components/common/Navbar';
import Sidebar      from './components/common/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';

import LoginPage        from './pages/LoginPage';
import SubmitPage       from './pages/investor/SubmitPage';
import StatusPage       from './pages/investor/StatusPage';
import MyRequestsPage   from './pages/investor/MyRequestsPage';
import TasksPage        from './pages/employee/TasksPage';
import MissingDataPage  from './pages/employee/MissingDataPage';
import DashboardPage    from './pages/manager/DashboardPage';
import RequestsPage     from './pages/manager/RequestsPage';
import EscalationsPage  from './pages/manager/EscalationsPage';

const Layout = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  </div>
);

const App = () => (
  <ConfigProvider
    locale={arEG}
    direction="rtl"
    theme={{
      token: {
        colorPrimary:    '#1e3a5f',
        colorLink:       '#1e3a5f',
        borderRadius:    6,
        fontFamily:      'Cairo, Tajawal, sans-serif',
      },
    }}
  >
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/unauthorized" element={<div className="text-center p-16 text-red-500 text-xl">غير مصرح لك بالوصول</div>} />

        {/* Investor */}
        <Route element={<ProtectedRoute roles={['INVESTOR']}><Layout /></ProtectedRoute>}>
          <Route path="/investor/submit" element={<SubmitPage />} />
          <Route path="/investor/status" element={<StatusPage />} />
          <Route path="/investor/my-requests" element={<MyRequestsPage />} />
        </Route>

        {/* Employee */}
        <Route element={<ProtectedRoute roles={['EMPLOYEE', 'MANAGER']}><Layout /></ProtectedRoute>}>
          <Route path="/employee/tasks"        element={<TasksPage />} />
          <Route path="/employee/missing-data" element={<MissingDataPage />} />
        </Route>

        {/* Manager */}
        <Route element={<ProtectedRoute roles={['MANAGER']}><Layout /></ProtectedRoute>}>
          <Route path="/manager/dashboard"   element={<DashboardPage />} />
          <Route path="/manager/requests"    element={<RequestsPage />} />
          <Route path="/manager/escalations" element={<EscalationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ConfigProvider>
);

export default App;
