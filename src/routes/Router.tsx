import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import MainLayout from "../layouts/MainLayout";
import PrivateRoute from "../components/PrivateRoute";
import ClassLogger from "../pages/ClassLogger";
import { useAuth } from "../context/AuthContext";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const ImportData = lazy(() => import("../pages/ImportData"));
const ClassTracker = lazy(() => import("../pages/ClassTracker"));
const Report = lazy(() => import("../pages/Report"));

const AdminRoutes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <Navigate to="/class-logger" replace />;
  }
  return <>{children}</>;
};

const StudentRoutes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== "student") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const Router: React.FC = () => {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <MainLayout />
                        </PrivateRoute>
                    }
                >
                    <Route index element={
                        <AdminRoutes>
                            <Dashboard />
                        </AdminRoutes>
                    } />
                    <Route path="/import-data" element={
                        <AdminRoutes>
                            <ImportData />
                        </AdminRoutes>
                    } />
                    <Route path="/class-tracker" element={
                        <AdminRoutes>
                            <ClassTracker />
                        </AdminRoutes>
                    } />
                    <Route path="/class-logger" element={
                        <StudentRoutes>
                            <ClassLogger />
                        </StudentRoutes>
                    } />
                    <Route path="/report" element={
                        <AdminRoutes>
                            <Report />
                        </AdminRoutes>
                    } />
                </Route>
            </Routes>
        </Suspense>
    );
};

export default Router;
