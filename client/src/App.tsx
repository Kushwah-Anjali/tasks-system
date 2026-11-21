import {
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute";

import AttendanceManagement from "./pages/AttendanceManagement";
import AddEmployee from "./pages/AddEmployee";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeTasks from "./pages/EmployeeTasks";
import Employees from "./pages/Employees";
import Login from "./pages/Login";
import ManagerDashboard from "./pages/ManagerDashboard";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import AdminAccounts from "./pages/AdminAccounts";
import Settings from "./pages/Settings";

import { getCurrentUser } from "./utils/authStorage";

function HomeRedirect() {
    const user = getCurrentUser();

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    const destination = user.role === "admin"
        ? "/admin/accounts"
        : user.role === "manager"
            ? "/dashboard"
            : "/employee-dashboard";

    return (
        <Navigate
            to={destination}
            replace
        />
    );
}

export default function App() {
    return (
        <Routes>
            {/* Default route */}
            <Route
                path="/"
                element={<HomeRedirect />}
            />

            {/* Public routes */}
            <Route
                path="/login"
                element={<Login />}
            />

            <Route
                path="/register"
                element={<HomeRedirect />}
            />

            <Route
                path="/admin/accounts"
                element={
                    <ProtectedRoute allowedRole="admin">
                        <AdminAccounts />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />

            {/* Manager routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute allowedRole="manager">
                        <ManagerDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/employees"
                element={
                    <ProtectedRoute allowedRole="manager">
                        <Employees />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/employees/new"
                element={
                    <ProtectedRoute allowedRole="manager">
                        <AddEmployee />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/tasks"
                element={
                    <ProtectedRoute allowedRole="manager">
                        <Tasks />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/tasks/:taskId"
                element={
                    <ProtectedRoute allowedRole="manager">
                        <TaskDetails />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/attendance"
                element={
                    <ProtectedRoute requireAttendanceView>
                        <AttendanceManagement />
                    </ProtectedRoute>
                }
            />

            {/* Employee routes */}
            <Route
                path="/employee-dashboard"
                element={
                    <ProtectedRoute allowedRole="employee">
                        <EmployeeDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/employee-tasks"
                element={
                    <ProtectedRoute allowedRole="employee">
                        <EmployeeTasks />
                    </ProtectedRoute>
                }
            />

            {/* Unknown route */}
            <Route
                path="*"
                element={<HomeRedirect />}
            />
        </Routes>
    );
}
