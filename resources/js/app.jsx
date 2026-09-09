import '../css/app.css';

import React, { useEffect, useState } from 'react';
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
import AdminBiometrics from './pages/admin/Biometrics';

// Onboarding Pages
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
import DeviceRegister from './pages/onboarding/DeviceRegister';
import DevicePending from './pages/onboarding/DevicePending';
import FaceEnrollment from './pages/onboarding/FaceEnrollment';
import CompleteProfile from './pages/onboarding/CompleteProfile';
import api from './api';

const EmployeeFeatureGuard = ({ feature, children }) => {
    const [allowed, setAllowed] = useState(null);
    useEffect(() => {
        api.get('/app-config').then(response => {
            const item = (response.data.data?.employee_menu || []).find(menu => menu.key === feature);
            setAllowed(item ? item.enabled : true);
        }).catch(() => setAllowed(true));
    }, [feature]);
    if (allowed === null) return <div className="p-12 text-center text-slate-500">Memeriksa akses fitur…</div>;
    return allowed ? children : <Navigate to="/employee/dashboard" replace />;
};

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
                    <Route path="attendance" element={<EmployeeFeatureGuard feature="attendance"><EmployeeAttendance /></EmployeeFeatureGuard>} />
                    <Route path="leave" element={<EmployeeFeatureGuard feature="leave"><EmployeeLeave /></EmployeeFeatureGuard>} />
                    <Route path="overtime" element={<EmployeeFeatureGuard feature="overtime"><EmployeeOvertime /></EmployeeFeatureGuard>} />
                    <Route path="claims" element={<EmployeeFeatureGuard feature="claims"><EmployeeClaims /></EmployeeFeatureGuard>} />
                    <Route path="payslip" element={<EmployeeFeatureGuard feature="payroll"><EmployeePayslip /></EmployeeFeatureGuard>} />
                    <Route path="shifts" element={<EmployeeFeatureGuard feature="schedule"><EmployeeResources type="shifts" /></EmployeeFeatureGuard>} />
                    <Route path="calendar" element={<EmployeeFeatureGuard feature="calendar"><EmployeeResources type="calendar" /></EmployeeFeatureGuard>} />
                    <Route path="announcements" element={<EmployeeFeatureGuard feature="announcements"><EmployeeResources type="announcements" /></EmployeeFeatureGuard>} />
                    <Route path="tasks" element={<EmployeeFeatureGuard feature="tasks"><EmployeeResources type="tasks" /></EmployeeFeatureGuard>} />
                    <Route path="attendance-adjustments" element={<EmployeeFeatureGuard feature="adjustments"><EmployeeResources type="adjustments" /></EmployeeFeatureGuard>} />
                    <Route path="business-trips" element={<EmployeeFeatureGuard feature="business_trips"><EmployeeResources type="trips" /></EmployeeFeatureGuard>} />
                    <Route path="notifications" element={<EmployeeFeatureGuard feature="notifications"><EmployeeResources type="notifications" /></EmployeeFeatureGuard>} />
                    <Route path="directory" element={<EmployeeFeatureGuard feature="directory"><EmployeeResources type="directory" /></EmployeeFeatureGuard>} />
                    <Route path="face-enrollment" element={<EmployeeFeatureGuard feature="biometric"><FaceEnrollment returnTo="/employee/dashboard" /></EmployeeFeatureGuard>} />
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
                    <Route path="biometrics" element={<AdminBiometrics />} />
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
