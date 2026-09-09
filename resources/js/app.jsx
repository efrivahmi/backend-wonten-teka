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
import AdminSettings from './pages/admin/Settings';
import EmployeeDashboard from './pages/employee/Dashboard';

import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeLeave from './pages/employee/Leave';
import EmployeeOvertime from './pages/employee/Overtime';
import EmployeeClaims from './pages/employee/Claims';
import EmployeePayslip from './pages/employee/Payslip';
import EmployeeResources from './pages/employee/Resources';
import AdminOperations from './pages/admin/Operations';

// Onboarding Pages
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
import DeviceRegister from './pages/onboarding/DeviceRegister';
import DevicePending from './pages/onboarding/DevicePending';
import FaceEnrollment from './pages/onboarding/FaceEnrollment';
import CompleteProfile from './pages/onboarding/CompleteProfile';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />
                
                {/* Onboarding Routes */}
                <Route path="/onboarding" element={<OnboardingFlow />} />
                <Route path="/onboarding/device" element={<DeviceRegister />} />
                <Route path="/onboarding/device-pending" element={<DevicePending />} />
                <Route path="/onboarding/face-enrollment" element={<FaceEnrollment />} />
                <Route path="/onboarding/complete-profile" element={<CompleteProfile />} />
                
                {/* Employee Routes */}
                <Route path="/employee" element={<EmployeeLayout />}>
                    <Route path="dashboard" element={<EmployeeDashboard />} />
                    <Route path="attendance" element={<EmployeeAttendance />} />
                    <Route path="leave" element={<EmployeeLeave />} />
                    <Route path="overtime" element={<EmployeeOvertime />} />
                    <Route path="claims" element={<EmployeeClaims />} />
                    <Route path="payslip" element={<EmployeePayslip />} />
                    <Route path="shifts" element={<EmployeeResources type="shifts" />} />
                    <Route path="calendar" element={<EmployeeResources type="calendar" />} />
                    <Route path="announcements" element={<EmployeeResources type="announcements" />} />
                    <Route path="tasks" element={<EmployeeResources type="tasks" />} />
                    <Route path="attendance-adjustments" element={<EmployeeResources type="adjustments" />} />
                    <Route path="business-trips" element={<EmployeeResources type="trips" />} />
                    <Route path="notifications" element={<EmployeeResources type="notifications" />} />
                    <Route path="directory" element={<EmployeeResources type="directory" />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="approvals" element={<AdminApprovals />} />
                    <Route path="employees" element={<AdminEmployees />} />
                    <Route path="schedule" element={<AdminSchedule />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="devices" element={<AdminOperations type="devices" />} />
                    <Route path="events" element={<AdminOperations type="events" />} />
                    <Route path="payroll" element={<AdminOperations type="payroll" />} />
                    <Route path="leave-types" element={<AdminOperations type="leaveTypes" />} />
                    <Route path="attendance-flags" element={<AdminOperations type="flags" />} />
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
