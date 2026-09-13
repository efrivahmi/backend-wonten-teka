import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Bell, Loader2, LogIn, LogOut, CheckCircle2, TrendingUp, CheckCircle, AlertTriangle, XCircle, Briefcase, CalendarDays, FileText, Plane, User } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    const attendanceChart = todayInfo?.monthly_stats ? [
        { label: 'Tepat waktu', value: todayInfo.monthly_stats.on_time || 0, color: 'bg-emerald-500' },
        { label: 'Terlambat', value: todayInfo.monthly_stats.late || 0, color: 'bg-amber-500' },
        { label: 'Tidak hadir', value: todayInfo.monthly_stats.absent || 0, color: 'bg-rose-500' },
    ] : [];
    const chartMax = Math.max(1, ...attendanceChart.map(item => item.value));

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
    const quickLinks = [
        ['/employee/attendance','Absensi',CalendarCheck], ['/employee/shifts','Jadwal Shift',Clock], ['/employee/leave','Ajukan Cuti',Briefcase],
        ['/employee/overtime','Lembur',Clock], ['/employee/claims','Reimburse',FileText], ['/employee/business-trips','Perjalanan Dinas',Plane],
        ['/employee/calendar','Kalender',CalendarDays], ['/employee/profile','Data Pribadi',User],
    ];
    const durationText = (start, end) => { const [sh,sm] = String(start).split(':').map(Number); const [eh,em] = String(end).split(':').map(Number); let minutes=(eh*60+em)-(sh*60+sm); if(minutes<=0) minutes+=1440; return `${Math.floor(minutes/60)} jam ${minutes%60 ? `${minutes%60} menit` : ''}`.trim(); };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="teka-hero min-h-72 rounded-[2rem] p-7 md:p-10 flex flex-col justify-between overflow-hidden">
                <p className="teka-kicker text-stone-400">Ruang kerja karyawan</p>
                <div className="max-w-xl py-10">
                    <h1 className="teka-display text-5xl md:text-7xl">Hadir. Bergerak. <span className="teka-accent">Berdampak.</span></h1>
                    <p className="text-stone-300 mt-6 max-w-md">Halo, {user.name}. Kelola kehadiran dan pekerjaan hari ini dalam satu alur yang jelas.</p>
                </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold text-slate-800">Akses Cepat</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{quickLinks.map(([href,label,Icon]) => <Link key={href} to={href} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center hover:border-emerald-300 hover:bg-emerald-50"><Icon className="mx-auto mb-2 h-6 w-6 text-emerald-700"/><span className="text-sm font-semibold text-slate-700">{label}</span></Link>)}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-800">Data Akun</h2><div className="mt-4 space-y-3 text-sm"><p><span className="block text-slate-400">Nama</span><strong>{user.name || '—'}</strong></p><p><span className="block text-slate-400">Email</span><strong>{user.email || '—'}</strong></p></div><Link to="/employee/profile" className="mt-5 inline-flex text-sm font-semibold text-emerald-700">Lihat data pribadi →</Link></div>
            </section>

            {/* Monthly Stats Row */}
            {todayInfo?.monthly_stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Kehadiran</span>
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{todayInfo.monthly_stats.percentage}%</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Hadir Tepat</span>
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{todayInfo.monthly_stats.on_time} <span className="text-base font-medium text-slate-500">kali</span></span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Terlambat</span>
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{todayInfo.monthly_stats.late} <span className="text-base font-medium text-slate-500">kali</span></span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                <XCircle className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Alpha</span>
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{todayInfo.monthly_stats.absent} <span className="text-base font-medium text-slate-500">hari</span></span>
                    </div>
                </div>
            )}

            {attendanceChart.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                        <div><h2 className="text-xl font-bold text-slate-800">Ringkasan Kehadiran Bulan Ini</h2><p className="text-sm text-slate-500">Perbandingan catatan kehadiran Anda pada bulan berjalan.</p></div>
                        <span className="text-sm font-semibold text-emerald-700">Tingkat kehadiran {todayInfo.monthly_stats.percentage}%</span>
                    </div>
                    <div className="space-y-4">
                        {attendanceChart.map(item => <div key={item.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
                            <span className="text-slate-600">{item.label}</span>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(item.value > 0 ? 8 : 0, (item.value / chartMax) * 100)}%` }} /></div>
                            <strong className="text-right text-slate-800">{item.value}</strong>
                        </div>)}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Jadwal Shift & Tombol Absen (Spans 2 columns on large screens) */}
                <div className="lg:col-span-3 space-y-6">
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
                                                <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Durasi {durationText(shift.start_time, shift.end_time)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Status: {shift.attendance?.status ? String(shift.attendance.status).replaceAll('_',' ') : 'Belum absen'}</span></div>
                                                
                                                {/* Attendance Times Display */}
                                                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
                                                    {hasCheckedIn && (
                                                        <div className="flex items-center">
                                                            <span className="flex items-center text-slate-700 font-medium mr-2">
                                                                <LogIn className="w-4 h-4 mr-1.5 text-slate-400" />
                                                                In: {new Date(shift.attendance.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                                                shift.attendance.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' :
                                                                shift.attendance.status === 'present' ? 'bg-amber-100 text-amber-700' :
                                                                shift.attendance.status === 'late' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {shift.attendance.status === 'on_time' ? 'Tepat Waktu' :
                                                                 shift.attendance.status === 'present' ? 'Toleransi' :
                                                                 shift.attendance.status === 'late' ? 'Terlambat' : shift.attendance.status}
                                                            </span>
                                                        </div>
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
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-amber-500" />
                        <h3 className="text-lg font-bold text-slate-800">Pengumuman Terbaru</h3>
                    </div>
                    <div className="p-0">
                        {announcements.length > 0 ? (
                            <ul className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-y-0 md:divide-x">
                                {announcements.map((ann, idx) => (
                                    <li key={idx} className="p-6 hover:bg-slate-50/50 transition-colors">
                                        <h4 className="font-bold text-slate-800 mb-1">{ann.title}</h4>
                                        <p className="text-sm text-slate-600 whitespace-pre-line">{ann.body || ann.content}</p>
                                        {ann.attachment_url && <a href={`/storage/${ann.attachment_url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-emerald-700">Buka lampiran pengumuman →</a>}
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
