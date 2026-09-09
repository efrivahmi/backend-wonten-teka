import React, { useState, useEffect } from 'react';
import { 
    Users, 
    CalendarCheck, 
    Clock, 
    AlertTriangle,
    FileText,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import api from '../../api';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/dashboard');
            setStats(response.data.data);
        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    const { employees, attendance_today, attendance_month, daily_attendance_trend = [], monthly_attendance_trend = [], department_attendance = [], pending_approvals, recent_flags } = stats;

    // Calculate percentage for attendance
    const attendancePercentage = employees.total > 0 
        ? Math.round((attendance_today.present / employees.total) * 100) 
        : 0;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="teka-hero min-h-64 rounded-[2rem] p-7 md:p-10 flex flex-col justify-between">
                <p className="teka-kicker text-stone-400">Pusat kendali organisasi</p>
                <div className="pt-12 max-w-2xl">
                    <h1 className="teka-display text-5xl md:text-7xl">Data yang membuat tim <span className="teka-accent">bergerak.</span></h1>
                    <p className="text-stone-300 mt-6">Pantau kehadiran, tindak lanjuti persetujuan, dan kelola operasional dari satu tempat.</p>
                </div>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-green-800 to-emerald-600 text-white p-6 shadow-lg shadow-emerald-900/10">
                    <p className="text-emerald-100 text-sm font-semibold">Tingkat kehadiran • {attendance_month?.label}</p>
                    <div className="flex items-end gap-3 mt-3"><strong className="text-5xl md:text-6xl">{attendance_month?.rate ?? 0}%</strong><span className="text-emerald-100 pb-2">bulan berjalan</span></div>
                    <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-lime-300 rounded-full transition-all" style={{width: `${Math.min(100, attendance_month?.rate ?? 0)}%`}} /></div>
                    <p className="mt-3 text-xs text-emerald-100">{attendance_month?.present_employee_days ?? 0} kehadiran dari {attendance_month?.expected_employee_days ?? 0} hari kerja karyawan yang diharapkan.</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-6">
                    <p className="text-sm text-slate-500">Rata-rata durasi kerja</p>
                    <strong className="block text-4xl text-slate-900 mt-3">{Math.floor((attendance_month?.average_work_minutes ?? 0) / 60)}j {(attendance_month?.average_work_minutes ?? 0) % 60}m</strong>
                    <p className="text-xs text-slate-400 mt-3">Dari absensi bulan berjalan yang memiliki waktu keluar.</p>
                </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="mb-6"><h2 className="font-bold text-slate-900 text-lg">Tren 6 bulan</h2><p className="text-sm text-slate-500">Persentase hadir terhadap hari kerja yang diharapkan.</p></div>
                    <div className="h-56 flex items-end gap-3">{monthly_attendance_trend.map(month => <div key={month.label} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><span className="text-xs font-bold text-emerald-700">{month.rate}%</span><div className="w-full max-w-12 bg-emerald-500 rounded-t-lg min-h-1 transition-all" style={{height: `${Math.max(2, month.rate)}%`}}/><span className="text-[10px] text-slate-500 text-center">{month.label}</span></div>)}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="mb-5"><h2 className="font-bold text-slate-900 text-lg">Kehadiran per departemen</h2><p className="text-sm text-slate-500">Kondisi langsung hari ini.</p></div>
                    <div className="space-y-4 max-h-64 overflow-y-auto">{department_attendance.map(dept => <div key={dept.department}><div className="flex justify-between text-sm mb-1"><span className="font-semibold text-slate-700">{dept.department}</span><span className="font-bold text-green-700">{dept.attendance_rate}%</span></div><div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-green-600 rounded-full" style={{width: `${Math.min(100, dept.attendance_rate)}%`}}/></div><p className="text-[11px] text-slate-400 mt-1">{dept.present} hadir • {dept.absent} belum hadir • {dept.late} terlambat</p></div>)}</div>
                </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="mb-5"><h2 className="font-bold text-slate-900 text-lg">Konsistensi bulan berjalan</h2><p className="text-sm text-slate-500">Tingkat kehadiran pada setiap hari kerja yang sudah berlalu.</p></div>
                <div className="flex gap-2 overflow-x-auto pb-2">{daily_attendance_trend.map(day => <div key={day.date} className="min-w-16 text-center"><div className="h-28 bg-slate-100 rounded-xl flex items-end overflow-hidden"><div className={`w-full ${day.rate >= 90 ? 'bg-emerald-500' : day.rate >= 70 ? 'bg-lime-500' : 'bg-amber-500'}`} style={{height: `${Math.max(3, day.rate)}%`}}/></div><strong className="block text-xs mt-2 text-slate-700">{day.rate}%</strong><span className="text-[10px] text-slate-400">{day.label}</span></div>)}</div>
            </section>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Karyawan</p>
                        <p className="text-3xl font-bold text-slate-800">{employees.total}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl">
                        <Users className="h-6 w-6 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Hadir Hari Ini</p>
                        <div className="flex items-baseline space-x-2">
                            <p className="text-3xl font-bold text-slate-800">{attendance_today.present}</p>
                            <p className="text-sm font-medium text-emerald-500">({attendancePercentage}%)</p>
                        </div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl">
                        <CalendarCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Terlambat</p>
                        <p className="text-3xl font-bold text-amber-600">{attendance_today.late}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl">
                        <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Pending Request</p>
                        <p className="text-3xl font-bold text-rose-600">{pending_approvals.total}</p>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl">
                        <FileText className="h-6 w-6 text-rose-600" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visualisasi Kehadiran & Status (CSS Bar Chart) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Status Kehadiran Hari Ini</h2>
                    <div className="flex-1 flex flex-col justify-center space-y-6">
                        
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-700">Hadir Tepat Waktu</span>
                                <span className="font-bold text-emerald-600">{attendance_today.present - attendance_today.late}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${employees.total > 0 ? ((attendance_today.present - attendance_today.late) / employees.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-700">Terlambat</span>
                                <span className="font-bold text-amber-500">{attendance_today.late}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-amber-500 h-3 rounded-full" style={{ width: `${employees.total > 0 ? (attendance_today.late / employees.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-700">Cuti / Izin</span>
                                <span className="font-bold text-blue-500">{attendance_today.on_leave}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${employees.total > 0 ? (attendance_today.on_leave / employees.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-700">Belum Absen / Mangkir</span>
                                <span className="font-bold text-rose-500">{attendance_today.absent}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-rose-500 h-3 rounded-full" style={{ width: `${employees.total > 0 ? (attendance_today.absent / employees.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Flags / Anomalies */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-bold text-slate-800">Menunggu Tinjauan</h3>
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                            {recent_flags.length} Aktif
                        </span>
                    </div>
                    <div className="p-0">
                        {recent_flags.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {recent_flags.map((flag) => (
                                    <li key={flag.id} className="p-5 flex items-start space-x-4 hover:bg-slate-50 transition-colors">
                                        <div className="bg-slate-100 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold">
                                            {flag.employee?.user?.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                {flag.employee?.user?.name}
                                            </p>
                                            <p className="text-xs text-amber-600 mt-1 font-medium">{flag.notes || 'Terdeteksi anomali pada absensi ini'}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(flag.created_at).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <button className="text-xs font-medium bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-emerald-600 transition-colors shadow-sm">
                                            Tinjau
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
                                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
                                <p className="font-medium text-slate-700">Semua Terkendali</p>
                                <p className="text-sm mt-1">Tidak ada anomali absensi yang perlu ditinjau.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Rincian Persetujuan & Karyawan Baru */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Rincian Persetujuan */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <h3 className="text-lg font-bold text-slate-800">Antrean Persetujuan</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-800 mb-1">{pending_approvals.leaves}</p>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Cuti</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-800 mb-1">{pending_approvals.overtimes}</p>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Lembur</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-800 mb-1">{pending_approvals.claims}</p>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Klaim</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Karyawan Baru */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
                        <Users className="h-5 w-5 text-slate-500" />
                        <h3 className="text-lg font-bold text-slate-800">Karyawan Baru Terdaftar</h3>
                    </div>
                    <div className="p-0">
                        {employees.recent.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {employees.recent.map((emp) => (
                                    <li key={emp.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-emerald-100 text-emerald-700 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">
                                                {emp.user?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{emp.user?.name}</p>
                                                <p className="text-xs text-slate-500">{emp.position || 'Staff'}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-400">
                                            {new Date(emp.created_at).toLocaleDateString('id-ID')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-6 text-center text-slate-500 text-sm">Belum ada karyawan terdaftar.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
