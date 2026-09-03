import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, CalendarCheck, Clock, Loader2 } from 'lucide-react';
import api from '../../api';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        pendingApprovals: 0,
        todayAttendance: 0,
    });
    const [recentEmployees, setRecentEmployees] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            // Fetch multiple data points in parallel
            const [employeesRes, approvalsRes, attendanceRes] = await Promise.all([
                api.get('/admin/employees'),
                api.get('/approvals/pending'),
                api.get('/admin/attendance?date=' + new Date().toISOString().split('T')[0])
            ].map(p => p.catch(e => ({ data: [] })))); // Catch individual errors so one failure doesn't break all

            // Parse responses
            const employees = employeesRes.data.data || employeesRes.data || [];
            const approvals = approvalsRes.data.data || approvalsRes.data || [];
            const attendance = attendanceRes.data.data || attendanceRes.data || [];

            setStats({
                totalEmployees: employees.length || 0,
                pendingApprovals: approvals.length || 0,
                todayAttendance: attendance.length || 0,
            });
            
            // Just take the first 5 employees as recent
            setRecentEmployees(employees.slice(0, 5));
        } catch (error) {
            console.error("Error fetching admin dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-green-700" />
            </div>
        );
    }

    const statCards = [
        { title: 'Total Karyawan', value: stats.totalEmployees, icon: Users, color: 'bg-blue-500' },
        { title: 'Hadir Hari Ini', value: stats.todayAttendance, icon: CalendarCheck, color: 'bg-green-500' },
        { title: 'Menunggu Persetujuan', value: stats.pendingApprovals, icon: CheckSquare, color: 'bg-amber-500' },
    ];

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard Admin</h1>
                <p className="text-slate-500 mt-1">Ringkasan aktivitas hari ini.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center space-x-4 transition-transform hover:scale-[1.02]">
                        <div className={`p-4 rounded-xl text-white ${stat.color} shadow-lg`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Employees Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800">Karyawan Terbaru</h3>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Nama</th>
                                    <th className="px-6 py-3 font-semibold">Email</th>
                                    <th className="px-6 py-3 font-semibold">Posisi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEmployees.length > 0 ? recentEmployees.map((emp) => (
                                    <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-800">{emp.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{emp.email}</td>
                                        <td className="px-6 py-4 text-slate-500">{emp.position || '-'}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-400">Belum ada data karyawan.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Approvals Quick View */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Menunggu Persetujuan</h3>
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold">{stats.pendingApprovals}</span>
                    </div>
                    <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
                        <CheckSquare className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 mb-4">Ada {stats.pendingApprovals} pengajuan yang butuh ditinjau.</p>
                        <a href="/admin/approvals" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                            Lihat Semua
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
