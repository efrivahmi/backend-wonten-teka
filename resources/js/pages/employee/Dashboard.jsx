import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Bell, Loader2, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import api from '../../api';

const EmployeeDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [todayInfo, setTodayInfo] = useState(null);
    const [upcomingShift, setUpcomingShift] = useState(null);
    const [announcements, setAnnouncements] = useState([]);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [infoRes, shiftRes, annRes] = await Promise.all([
                api.get('/attendance/today-info').catch(() => ({ data: { data: null } })),
                api.get('/shifts/upcoming').catch(() => ({ data: { data: null } })),
                api.get('/announcements').catch(() => ({ data: { data: [] } }))
            ]);

            setTodayInfo(infoRes.data || null);
            setUpcomingShift((shiftRes.data.data && shiftRes.data.data[0]) || (shiftRes.data && shiftRes.data[0]) || null);
            setAnnouncements(annRes.data.data || annRes.data || []);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    const shifts = todayInfo?.shifts || [];

    const handleAttendance = (action, shift) => {
        const query = new URLSearchParams({
            action: action,
        });
        if (shift.assignment_id) {
            query.append('assignment_id', shift.assignment_id);
        }
        if (shift.template_id) {
            query.append('template_id', shift.template_id);
        }
        window.location.href = `/employee/attendance?${query.toString()}`;
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Halo, {user.name} 👋</h1>
                <p className="text-slate-500 mt-1">Selamat datang di portal karyawan Wonten Teka.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Jadwal Shift & Tombol Absen (Spans 2 columns on large screens) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-blue-600" />
                            Jadwal Shift Hari Ini
                        </h2>
                    </div>

                    {shifts.length > 0 ? (
                        <div className="space-y-4">
                            {shifts.map((shift, idx) => {
                                const hasCheckedIn = shift.attendance !== null;
                                const hasCheckedOut = shift.attendance?.check_out_time !== null && shift.attendance !== null;
                                
                                // Determine if the previous shift is completed. 
                                // To check in to Shift 2, Shift 1 must be checked out.
                                let isLocked = false;
                                if (idx > 0 && !hasCheckedIn) {
                                    const prevShift = shifts[idx - 1];
                                    if (prevShift.attendance === null || prevShift.attendance.check_out_time === null) {
                                        isLocked = true;
                                    }
                                }

                                return (
                                    <div key={idx} className={`bg-white rounded-2xl shadow-sm border ${isLocked ? 'border-slate-200 opacity-75' : 'border-emerald-200'} p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all`}>
                                        <div className="flex items-center space-x-4 w-full md:w-auto">
                                            <div className="h-16 w-16 bg-blue-100 text-blue-700 rounded-xl flex flex-col items-center justify-center font-bold shrink-0">
                                                <span className="text-sm uppercase">HARI INI</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-800">{shift.name}</h3>
                                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                                                        shift.category === 'Piket' ? 'bg-orange-100 text-orange-700' : 
                                                        shift.category === 'Lembur' ? 'bg-purple-100 text-purple-700' : 
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {shift.category || 'Reguler'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 font-medium flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {shift.start_time} - {shift.end_time}
                                                </p>
                                                
                                                {/* Attendance Times Display */}
                                                <div className="mt-2 flex items-center gap-4 text-xs">
                                                    {hasCheckedIn && (
                                                        <span className="flex items-center text-emerald-600 font-medium">
                                                            <LogIn className="w-3 h-3 mr-1" />
                                                            In: {new Date(shift.attendance.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    {hasCheckedOut && (
                                                        <span className="flex items-center text-rose-600 font-medium">
                                                            <LogOut className="w-3 h-3 mr-1" />
                                                            Out: {new Date(shift.attendance.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
                                            {!hasCheckedIn ? (
                                                <button 
                                                    onClick={() => handleAttendance('check-in', shift)}
                                                    disabled={isLocked}
                                                    title={isLocked ? "Selesaikan shift sebelumnya terlebih dahulu" : ""}
                                                    className={`w-full md:w-40 flex items-center justify-center px-4 py-2.5 rounded-xl font-bold transition-all ${
                                                        !isLocked 
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20' 
                                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <LogIn className="h-4 w-4 mr-2" />
                                                    Check In
                                                </button>
                                            ) : !hasCheckedOut ? (
                                                <button 
                                                    onClick={() => handleAttendance('check-out', shift)}
                                                    className="w-full md:w-40 flex items-center justify-center px-4 py-2.5 rounded-xl font-bold transition-all bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20"
                                                >
                                                    <LogOut className="h-4 w-4 mr-2" />
                                                    Check Out
                                                </button>
                                            ) : (
                                                <div className="w-full md:w-40 flex items-center justify-center px-4 py-2.5 rounded-xl font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Selesai
                                                </div>
                                            )}
                                            {isLocked && (
                                                <p className="text-[10px] text-rose-500 text-center max-w-[160px]">Selesaikan shift sebelumnya</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-lg font-medium text-slate-800">Tidak ada jadwal shift hari ini.</p>
                        </div>
                    )}
                </div>

                {/* Pengumuman */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-amber-500" />
                        <h3 className="text-lg font-bold text-slate-800">Pengumuman Terbaru</h3>
                    </div>
                    <div className="p-0">
                        {announcements.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {announcements.map((ann, idx) => (
                                    <li key={idx} className="p-6 hover:bg-slate-50/50 transition-colors">
                                        <h4 className="font-bold text-slate-800 mb-1">{ann.title}</h4>
                                        <p className="text-sm text-slate-600 whitespace-pre-line">{ann.content}</p>
                                        <p className="text-xs text-slate-400 mt-3 font-medium">
                                            {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                <p>Tidak ada pengumuman saat ini.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
