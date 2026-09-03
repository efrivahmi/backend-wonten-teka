
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeLayout from './layouts/EmployeeLayout';
import AdminLayout from './layouts/AdminLayout';

// Placeholder Pages
const EmployeeDashboard = () => <div className="p-8"><h1 className="text-3xl font-bold text-green-800">Employee Dashboard</h1></div>;
const AdminDashboard = () => <div className="p-8"><h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1></div>;

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Route */}
                <Route path="/web/login" element={<Login />} />
                
                {/* Employee Routes */}
                <Route path="/web/employee" element={<EmployeeLayout />}>
                    <Route path="dashboard" element={<EmployeeDashboard />} />
                    {/* Add more employee routes here */}
                </Route>

                {/* Admin Routes */}
                <Route path="/web/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    {/* Add more admin routes here */}
                </Route>

                {/* Fallback Route */}
                <Route path="/web/*" element={<Navigate to="/web/login" />} />
            </Routes>
        </BrowserRouter>
    );
};

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
