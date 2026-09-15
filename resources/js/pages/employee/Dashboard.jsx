import React, { useEffect, useMemo, useState } from 'react';
import {
    Bell, Briefcase, CalendarCheck, CalendarDays, CheckCircle2, Clock,
    FileText, Layers3, Loader2, LogIn, LogOut, Plane, Timer, User, XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';

const statusMeta = {
    on_time: { label: 'Tepat waktu', tone: 'emerald' },
    present: { label: 'Tepat waktu', tone: 'emerald' },
    late: { label: 'Terlambat', tone: 'amber' },
    absent: { label: 'Alpha / Tidak masuk', tone: 'rose' },
    incomplete: { label: 'Belum check-out', tone: 'amber' },
};

const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

const formatTime = (value, status) => {
    if (!value || status === 'absent') return '--:--';
    return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const durationText = (attendance, now) => {
    if (!attendance?.check_in_time || attendance.status === 'absent') return '0j 0m';
    const start = new Date(attendance.check_in_time);
    const end = attendance.check_out_time ? new Date(attendance.check_out_time) : now;
    const minutes = Math.max(0, Math.min(1440, Math.floor((end - start) / 60000)));
    return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
};

const shiftDuration = (start, end) => {
    const [startHour, startMinute] = String(start).split(':').map(Number);
    const [endHour, endMinute] = String(end).split(':').map(Number);
    let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes <= 0) minutes += 1440;
    return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
};

const SummaryCard = ({ label, value, icon: Icon, tone = 'slate' }) => (
    <div className={`rounded-2xl border p-4 sm:p-5 ${toneClasses[tone]}`}>
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-75">{label}</span>
            <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 text-2xl font-black tracking-tight">{value}</p>
    </div>
);

export default function EmployeeDashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employee = user.employee || {};
    const [todayInfo, setTodayInfo] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [now, setNow] = useState(new Date());

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [attendanceResponse, announcementResponse] = await Promise.all([
                api.get('/attendance/today-info'),
                api.get('/announcements'),
            ]);
            setTodayInfo(attendanceResponse.data || null);
            setAnnouncements(announcementResponse.data?.data || announcementResponse.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Dashboard belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const shifts = todayInfo?.shifts || [];
    const hasDoubleShift = todayInfo?.has_double_shift ?? shifts.length > 1;
    const overtimeToday = todayInfo?.overtime_today || [];
    const currentAttendance = useMemo(
        () => shifts.map(shift => shift.attendance).find(Boolean) || null,
        [shifts],
    );
    const currentStatus = currentAttendance?.status || 'not_started';
    const currentStatusMeta = statusMeta[currentStatus] || { label: 'Belum absen', tone: 'slate' };
    const stats = todayInfo?.monthly_stats || {};
    const totalPresent = stats.present_days ?? ((stats.on_time || 0) + (stats.grace_period || 0) + (stats.late || 0));

    const quickLinks = [
        ['/employee/attendance', 'Absensi', CalendarCheck],
        ['/employee/habits', 'Habit Tracker', CheckCircle2],
        ['/employee/shifts', 'Jadwal Shift', Clock],
        ['/employee/leave', 'Ajukan Cuti', Briefcase],
        ['/employee/overtime', 'Lembur', Clock],
        ['/employee/claims', 'Reimburse', FileText],
        ['/employee/business-trips', 'Perjalanan Dinas', Plane],
        ['/employee/calendar', 'Kalender', CalendarDays],
    ];

    const openAttendance = (action, shift) => {
        const query = new URLSearchParams({ action });
        if (shift?.assignment_id) query.set('assignment_id', shift.assignment_id);
        if (shift?.template_id) query.set('template_id', shift.template_id);
        navigate(`/employee/attendance?${query.toString()}`);
    };

    if (loading) {
        return <div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div>;
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 md:p-8">
            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error} <button onClick={load} className="ml-2 font-bold underline">Muat ulang</button></div>}

            {/* 0. Welcome banner and profile */}
            <section className="teka-hero overflow-hidden rounded-[2rem] p-6 sm:p-8">
                <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                        <p className="teka-kicker text-stone-400">Ruang kerja karyawan</p>
                        <h1 className="teka-display mt-5 text-4xl sm:text-6xl"><span className="teka-accent">{employee.full_name || user.name || 'Karyawan'}</span></h1>
                        <p className="mt-4 max-w-xl text-sm text-stone-300">Pantau kehadiran, shift, dan informasi kerja Anda dari satu halaman.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur-sm md:min-w-72">
                        <div className="flex items-center gap-3">
                            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/15"><User className="h-6 w-6" /></span>
                            <div><strong className="block">{employee.full_name || user.name || 'Karyawan'}</strong><span className="text-xs text-stone-300">{employee.employee_number || 'Nomor pegawai belum diatur'}</span></div>
                        </div>
                        <p className="mt-4 text-sm text-stone-300">{employee.position || 'Posisi belum diatur'} • {employee.department || 'Unit belum diatur'}</p>
                        <Link to="/employee/profile" className="mt-4 inline-flex text-sm font-bold text-lime-300">Lihat profil lengkap →</Link>
                    </div>
                </div>
            </section>

            {/* 1. Latest announcements */}
            <section>
                <SectionHeading title="Pengumuman Terbaru" subtitle="Informasi terbaru yang perlu Anda ketahui." />
                {announcements.length ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {announcements.slice(0, 3).map(item => (
                            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Bell className="h-5 w-5" /></span><span className="text-xs text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : ''}</span></div>
                                <h3 className="mt-4 font-bold text-slate-900">{item.title}</h3>
                                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.body || item.content || 'Buka untuk melihat detail pengumuman.'}</p>
                            </article>
                        ))}
                    </div>
                ) : <EmptyCard text="Belum ada pengumuman terbaru." />}
            </section>

            {/* 2. Today's attendance */}
            <section>
                <SectionHeading title="Pencatatan Absensi Hari Ini" subtitle="Status, waktu masuk, waktu keluar, dan durasi kerja hari ini." action={<Link to="/employee/attendance" className="text-sm font-bold text-emerald-700">Buka riwayat</Link>} />
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <SummaryCard label="Status" value={currentStatusMeta.label} icon={CheckCircle2} tone={currentStatusMeta.tone} />
                    <SummaryCard label="Jam masuk" value={formatTime(currentAttendance?.check_in_time, currentStatus)} icon={LogIn} tone="emerald" />
                    <SummaryCard label="Jam keluar" value={formatTime(currentAttendance?.check_out_time, currentStatus)} icon={LogOut} tone="rose" />
                    <SummaryCard label="Durasi kerja" value={durationText(currentAttendance, now)} icon={Clock} tone="blue" />
                </div>
            </section>

            {(hasDoubleShift || overtimeToday.length > 0) && (
                <section>
                    <SectionHeading title="Jadwal Tambahan Hari Ini" subtitle="Penugasan khusus dari admin yang perlu Anda perhatikan sebelum melakukan absensi." />
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {hasDoubleShift && (
                            <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-900">
                                <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Layers3 className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Shift ganda</p><h3 className="mt-1 text-lg font-black">{shifts.length} shift hari ini</h3><p className="mt-2 text-sm text-violet-700">{shifts.map(shift => `${shift.name} ${shift.start_time}–${shift.end_time}`).join(' • ')}</p></div></div>
                            </article>
                        )}
                        {overtimeToday.map(item => (
                            <article key={item.id} className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
                                <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-500 text-white"><Timer className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-widest text-orange-600">Lembur disetujui</p><h3 className="mt-1 text-lg font-black">{String(item.start_time).slice(0, 5)}–{String(item.end_time).slice(0, 5)}</h3><p className="mt-2 text-sm text-orange-700">{item.overtime_type || 'Lembur'}{item.reason ? ` • ${item.reason}` : ''}</p></div></div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* 3. Today's shifts */}
            <section>
                <SectionHeading title="Jadwal Shift Hari Ini" subtitle="Jadwal dan progres kehadiran untuk setiap shift." action={<Link to="/employee/shifts" className="text-sm font-bold text-emerald-700">Semua jadwal</Link>} />
                <div className="mt-4 space-y-4">
                    {shifts.length ? shifts.map((shift, index) => {
                        const attendance = shift.attendance;
                        const status = attendance?.status || 'not_started';
                        const meta = statusMeta[status] || { label: 'Belum absen', tone: 'slate' };
                        const hasCheckedIn = Boolean(attendance?.check_in_time) && status !== 'absent';
                        const hasCheckedOut = Boolean(attendance?.check_out_time);
                        const ended = shift.time_status === 'ended';
                        return (
                            <article key={shift.assignment_id || `${shift.template_id}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                                    <div className="flex items-start gap-4">
                                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Clock className="h-6 w-6" /></span>
                                        <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{shift.name}</h3><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${toneClasses[meta.tone]}`}>{meta.label}</span></div><p className="mt-2 text-sm text-slate-500">{shift.start_time}–{shift.end_time} • {shiftDuration(shift.start_time, shift.end_time)} • {shift.category || 'Reguler'}</p></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {!hasCheckedIn && !ended && status !== 'absent' && <button onClick={() => openAttendance('check-in', shift)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Check In</button>}
                                        {hasCheckedIn && !hasCheckedOut && <button onClick={() => openAttendance('check-out', shift)} disabled={!ended} title={!ended ? `Check Out tersedia mulai pukul ${shift.end_time}` : ''} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${ended ? 'bg-slate-900 text-white' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}>{ended ? 'Check Out' : `Keluar mulai ${shift.end_time}`}</button>}
                                        {(hasCheckedOut || status === 'absent') && <Link to="/employee/attendance" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Lihat riwayat</Link>}
                                    </div>
                                </div>
                            </article>
                        );
                    }) : <EmptyCard text="Tidak ada shift yang dijadwalkan hari ini." />}
                </div>
            </section>

            {/* 4. Monthly statistics, deliberately without charts */}
            <section>
                <SectionHeading title={`Statistik Kehadiran ${stats.month_label || 'Bulan Ini'}`} subtitle={`Perhitungan otomatis dimulai kembali setiap awal bulan. Bulan ini memiliki ${stats.days_in_month || '—'} hari kalender.`} />
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <SummaryCard label="Kehadiran bulan ini" value={`${totalPresent} dari ${stats.days_in_month || '—'} hari`} icon={CalendarCheck} tone="blue" />
                    <SummaryCard label="Tepat waktu" value={`${stats.on_time || 0} hari`} icon={CheckCircle2} tone="emerald" />
                    <SummaryCard label="Terlambat" value={`${stats.late || 0} hari`} icon={Clock} tone="amber" />
                    <SummaryCard label="Alpha" value={`${stats.absent || 0} hari`} icon={XCircle} tone="rose" />
                </div>
            </section>

            {/* 5. Quick access stays last */}
            <section>
                <SectionHeading title="Akses Cepat" subtitle="Buka fitur yang paling sering digunakan." />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    {quickLinks.map(([href, label, Icon]) => <Link key={href} to={href} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"><Icon className="mx-auto h-6 w-6 text-emerald-700" /><span className="mt-3 block text-xs font-bold text-slate-700">{label}</span></Link>)}
                </div>
            </section>
        </div>
    );
}

const SectionHeading = ({ title, subtitle, action }) => (
    <div className="flex items-end justify-between gap-4">
        <div><h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
        {action}
    </div>
);

const EmptyCard = ({ text }) => (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">{text}</div>
);
