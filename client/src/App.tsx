import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Employees from "./pages/Employees";
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register" element={<Register />} />
      <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
      <Route path="/employees" element={<Employees />} />
    </Routes>
  );
}
