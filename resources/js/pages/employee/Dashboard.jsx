import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Bell, Loader2, LogIn, LogOut } from 'lucide-react';
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

            setTodayInfo(infoRes.data.data || infoRes.data || null);
            setUpcomingShift(shiftRes.data.data || shiftRes.data || null);
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

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Halo, {user.name} 👋</h1>
                <p className="text-slate-500 mt-1">Selamat datang di portal karyawan Wonten Teka.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Absensi Hari Ini */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Absensi Hari Ini</h2>
                        <div className="bg-emerald-50 p-2 rounded-lg">
                            <CalendarCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                            <LogIn className="h-6 w-6 text-emerald-500 mb-2" />
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Jam Masuk</p>
                            <p className="text-xl font-bold text-slate-800">
                                {todayInfo?.check_in_time || '--:--'}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                            <LogOut className="h-6 w-6 text-rose-500 mb-2" />
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Jam Keluar</p>
                            <p className="text-xl font-bold text-slate-800">
                                {todayInfo?.check_out_time || '--:--'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Jadwal Shift */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Jadwal Mendatang</h2>
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>

                    {upcomingShift ? (
                        <div className="flex items-center space-x-4">
                            <div className="h-16 w-16 bg-blue-100 text-blue-700 rounded-xl flex flex-col items-center justify-center font-bold">
                                <span className="text-sm uppercase">{new Date(upcomingShift.date).toLocaleString('id-ID', { weekday: 'short' })}</span>
                                <span className="text-xl">{new Date(upcomingShift.date).getDate()}</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{upcomingShift.shift_template?.name || 'Shift Reguler'}</h3>
                                <p className="text-sm text-slate-500">
                                    {upcomingShift.shift_template?.start_time} - {upcomingShift.shift_template?.end_time}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Clock className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">Belum ada jadwal shift dalam waktu dekat.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pengumuman */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
    );
};

export default EmployeeDashboard;
