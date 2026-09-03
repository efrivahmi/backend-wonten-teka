
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeLayout from './layouts/EmployeeLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminApprovals from './pages/admin/Approvals';
import AdminEmployees from './pages/admin/Employees';
import AdminSchedule from './pages/admin/Schedule';
import AdminReports from './pages/admin/Reports';
import EmployeeDashboard from './pages/employee/Dashboard';

import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeLeave from './pages/employee/Leave';
import EmployeeOvertime from './pages/employee/Overtime';
import EmployeeClaims from './pages/employee/Claims';
import EmployeePayslip from './pages/employee/Payslip';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />
                
                {/* Employee Routes */}
                <Route path="/employee" element={<EmployeeLayout />}>
                    <Route path="dashboard" element={<EmployeeDashboard />} />
                    <Route path="attendance" element={<EmployeeAttendance />} />
                    <Route path="leave" element={<EmployeeLeave />} />
                    <Route path="overtime" element={<EmployeeOvertime />} />
                    <Route path="claims" element={<EmployeeClaims />} />
                    <Route path="payslip" element={<EmployeePayslip />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="approvals" element={<AdminApprovals />} />
                    <Route path="employees" element={<AdminEmployees />} />
                    <Route path="schedule" element={<AdminSchedule />} />
                    <Route path="reports" element={<AdminReports />} />
                </Route>

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
};

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
