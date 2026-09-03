
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeLayout from './layouts/EmployeeLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';

// Employee Pages Placeholder
const EmployeeAttendance = () => <div className="p-8"><h1 className="text-3xl font-bold text-green-800">Absensi (Belum Diimplementasi)</h1></div>;
const EmployeeLeave = () => <div className="p-8"><h1 className="text-3xl font-bold text-green-800">Cuti (Belum Diimplementasi)</h1></div>;
const EmployeeOvertime = () => <div className="p-8"><h1 className="text-3xl font-bold text-green-800">Lembur (Belum Diimplementasi)</h1></div>;
const EmployeeClaims = () => <div className="p-8"><h1 className="text-3xl font-bold text-green-800">Klaim (Belum Diimplementasi)</h1></div>;
const EmployeePayslip = () => <div className="p-8"><h1 className="text-3xl font-bold text-green-800">Slip Gaji (Belum Diimplementasi)</h1></div>;


// Admin Pages Placeholder
const AdminApprovals = () => <div className="p-8"><h1 className="text-3xl font-bold text-slate-800">Persetujuan (Belum Diimplementasi)</h1></div>;
const AdminEmployees = () => <div className="p-8"><h1 className="text-3xl font-bold text-slate-800">Karyawan (Belum Diimplementasi)</h1></div>;
const AdminSchedule = () => <div className="p-8"><h1 className="text-3xl font-bold text-slate-800">Jadwal (Belum Diimplementasi)</h1></div>;
const AdminReports = () => <div className="p-8"><h1 className="text-3xl font-bold text-slate-800">Laporan (Belum Diimplementasi)</h1></div>;

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
