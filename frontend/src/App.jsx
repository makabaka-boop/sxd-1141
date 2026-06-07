import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/Layout';
import Login from './pages/Login';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import ReviewList from './pages/ReviewList';
import BasicData from './pages/BasicData';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

const ManagerRoute = () => {
  const { user, isManager, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (!user || !isManager()) {
    return <Navigate to="/tasks" replace />;
  }
  
  return <Outlet />;
};

const ReviewerRoute = () => {
  const { user, isReviewer, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (!user || !isReviewer()) {
    return <Navigate to="/tasks" replace />;
  }
  
  return <Outlet />;
};

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/tasks" replace />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />
              <Route element={<ReviewerRoute />}>
                <Route path="/reviews" element={<ReviewList />} />
              </Route>
              <Route element={<ManagerRoute />}>
                <Route path="/basic-data" element={<BasicData />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
