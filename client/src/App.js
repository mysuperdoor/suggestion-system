import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuggestionList from './pages/Suggestions/List';
import SuggestionDetail from './pages/Suggestions/Detail';
import NewSuggestion from './pages/Suggestions/New';
import ReviewList from './pages/Suggestions/Review';
import ImplementationList from './pages/Suggestions/Implementation';
import UserManagement from './pages/Admin/components/UserManagement';
import ChangePassword from './pages/ChangePassword';
import Reports from './pages/Reports';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import ManagerRoute from './components/ManagerRoute';
import DepartmentManagerRoute from './components/DepartmentManagerRoute';
import ReviewPermissionRoute from './components/ReviewPermissionRoute';
import DepartmentPerformance from './pages/Reports/DepartmentPerformance';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="suggestions/list" element={<SuggestionList />} />
          <Route path="suggestions/new" element={<NewSuggestion />} />
          <Route path="suggestions/:id" element={<SuggestionDetail />} />
          <Route path="change-password" element={<ChangePassword />} />
          
          {/* 审核和实施跟踪路由 */}
          <Route path="suggestions/review" element={
            <ReviewPermissionRoute>
              <ReviewList />
            </ReviewPermissionRoute>
          } />
          <Route path="suggestions/implementation" element={
            <ManagerRoute>
              <ImplementationList />
            </ManagerRoute>
          } />
          
          {/* 管理员路由 */}
          <Route path="users" element={
            <DepartmentManagerRoute>
              <UserManagement />
            </DepartmentManagerRoute>
          } />
          <Route path="reports" element={
            <ManagerRoute>
              <Reports />
            </ManagerRoute>
          } />
          <Route path="reports/department-performance" element={<PrivateRoute><DepartmentPerformance /></PrivateRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App; 