import React, { useEffect, useMemo, useState } from 'react';
import {
    Bell, Briefcase, CalendarCheck, CalendarDays, CheckCircle2, Clock,
    FileText, Layers3, Loader2, LogIn, LogOut, Plane, Timer, User, XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import MobileAppDownloadCard from '../../components/MobileAppDownloadCard';
import { enableEventAlarms, eventAlarmPermission, scheduleEventAlarms } from '../../eventAlarmService';

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

const eventDate = value => value
    ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Tanggal belum ditentukan';

const eventDay = value => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit' }) : '--';
const eventMonth = value => value ? new Date(value).toLocaleDateString('id-ID', { month: 'short' }).toUpperCase() : '---';

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
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [alarmEnabled, setAlarmEnabled] = useState(() => eventAlarmPermission() === 'granted');
    const [alarmMessage, setAlarmMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [now, setNow] = useState(new Date());

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [attendanceResponse, announcementResponse, calendarResponse] = await Promise.all([
                api.get('/attendance/today-info'),
                api.get('/announcements'),
                api.get('/calendar').catch(() => ({ data: { events: [] } })),
            ]);
            setTodayInfo(attendanceResponse.data || null);
            setAnnouncements(announcementResponse.data?.data || announcementResponse.data || []);
            setCalendarEvents(calendarResponse.data?.events || []);
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

    useEffect(() => {
        if (alarmEnabled) scheduleEventAlarms(calendarEvents);
    }, [alarmEnabled, calendarEvents]);

    const activateEventAlarm = async () => {
        const enabled = await enableEventAlarms();
        setAlarmEnabled(enabled);
        setAlarmMessage(enabled ? 'Alarm event aktif di browser ini.' : 'Izin notifikasi belum diberikan oleh browser.');
        if (enabled) scheduleEventAlarms(calendarEvents);
    };

    const shifts = todayInfo?.shifts || [];
    const primaryShift = shifts.find(s => s.category === 'Reguler' || !s.category) || shifts[0];
    const hasDoubleShift = todayInfo?.has_double_shift ?? shifts.length > 1;
    const overtimeToday = todayInfo?.overtime_today || [];
    const currentAttendance = useMemo(
        () => {
            return primaryShift?.attendance || null;
        },
        [primaryShift],
    );
    const currentStatus = currentAttendance?.status || 'not_started';
    const currentStatusMeta = statusMeta[currentStatus] || { label: 'Belum absen', tone: 'slate' };
    const hasCheckedIn = Boolean(currentAttendance?.check_in_time) && currentStatus !== 'absent';
    const hasCheckedOut = Boolean(currentAttendance?.check_out_time);
    const shiftEnded = primaryShift?.time_status === 'ended';
    const stats = todayInfo?.monthly_stats || {};
    const totalPresent = stats.present_days ?? ((stats.on_time || 0) + (stats.grace_period || 0) + (stats.late || 0));

    const quickLinks = [
        ['/employee/habits', 'Habit Tracker', CheckCircle2],
        ['/employee/leave', 'Ajukan Cuti', Briefcase],
        ['/employee/overtime', 'Lembur', Clock],
        ['/employee/claims', 'Reimburse', FileText],
        ['/employee/business-trips', 'Perjalanan Dinas', Plane],
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

            {/* 0. Welcome banner and primary attendance action */}
            <section className="teka-hero overflow-hidden rounded-4xl p-6 sm:p-8">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)] lg:items-end">
                    <div>
                        <p className="teka-kicker text-stone-400">Ruang kerja karyawan</p>
                        <h1 className="teka-display mt-5 text-4xl sm:text-6xl"><span className="teka-accent">{employee.full_name || user.name || 'Karyawan'}</span></h1>
                        <p className="mt-4 max-w-xl text-sm text-stone-300">Pantau kehadiran, shift, dan informasi kerja Anda dari satu halaman.</p>
                    </div>
                    <div className="min-w-0 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-sm sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15"><User className="h-6 w-6" /></span>
                                <div className="min-w-0"><strong className="block truncate">{employee.full_name || user.name || 'Karyawan'}</strong><span className="block truncate text-xs text-stone-300">{employee.employee_number || 'Nomor pegawai belum diatur'}</span></div>
                            </div>
                            <span aria-live="polite" className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${currentStatusMeta.tone === 'emerald' ? 'border-emerald-300/30 bg-emerald-400/20 text-emerald-100' : currentStatusMeta.tone === 'amber' ? 'border-amber-300/30 bg-amber-400/20 text-amber-100' : currentStatusMeta.tone === 'rose' ? 'border-rose-300/30 bg-rose-400/20 text-rose-100' : 'border-white/20 bg-white/10 text-white/80'}`}>{currentStatusMeta.label}</span>
                        </div>
                        <p className="mt-4 truncate text-sm text-stone-300">{employee.position || 'Posisi belum diatur'} • {employee.department || 'Unit belum diatur'}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/10 p-3 text-sm">
                            <div><span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Masuk</span><strong>{formatTime(currentAttendance?.check_in_time, currentStatus)}</strong></div>
                            <div><span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Keluar</span><strong>{formatTime(currentAttendance?.check_out_time, currentStatus)}</strong></div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {!hasCheckedIn && primaryShift && !shiftEnded && currentStatus !== 'absent' && <button type="button" aria-label="Mulai check in untuk shift hari ini" onClick={() => openAttendance('check-in', primaryShift)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-200 focus:ring-offset-2 focus:ring-offset-slate-900"><LogIn className="mr-2 h-4 w-4" />Check In</button>}
                            {hasCheckedIn && !hasCheckedOut && <button type="button" aria-label={shiftEnded ? 'Mulai check out untuk shift hari ini' : `Check out tersedia mulai ${primaryShift?.end_time || 'waktu shift berakhir'}`} onClick={() => shiftEnded && openAttendance('check-out', primaryShift)} disabled={!shiftEnded} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-white/80 ${shiftEnded ? 'bg-white text-slate-950 hover:bg-blue-50' : 'cursor-not-allowed bg-white/15 text-white/60'}`}><LogOut className="mr-2 h-4 w-4" />{shiftEnded ? 'Check Out' : `Keluar mulai ${primaryShift?.end_time || 'akhir shift'}`}</button>}
                        </div>
                    </div>
                </div>
            </section>

            <section aria-labelledby="attendance-summary-title" className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Prioritas utama</p>
                        <h2 id="attendance-summary-title" className="mt-1 text-2xl font-black tracking-tight text-slate-900">Absensi hari ini</h2>
                        <p className="mt-1 text-sm text-slate-500">Ringkasan kehadiran Anda untuk shift utama.</p>
                    </div>
                    <Link to="/employee/attendance" className="text-sm font-bold text-emerald-700 hover:underline">Lihat riwayat lengkap →</Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <SummaryCard label="Status" value={currentStatusMeta.label} icon={CheckCircle2} tone={currentStatusMeta.tone} />
                    <SummaryCard label="Jam masuk" value={formatTime(currentAttendance?.check_in_time, currentStatus)} icon={LogIn} tone="emerald" />
                    <SummaryCard label="Jam keluar" value={formatTime(currentAttendance?.check_out_time, currentStatus)} icon={LogOut} tone="rose" />
                    <SummaryCard label="Durasi kerja" value={durationText(currentAttendance, now)} icon={Clock} tone="blue" />
                </div>
                <div className="mt-5 border-t border-slate-100 pt-5">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div><h3 className="font-black text-slate-900">Ringkasan bulan ini</h3><p className="text-sm text-slate-500">Rekap kehadiran tetap berada dalam satu bagian absensi.</p></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{stats.month_label || 'Bulan berjalan'}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <SummaryCard label="Hadir" value={`${totalPresent} hari`} icon={CalendarCheck} tone="blue" />
                        <SummaryCard label="Tepat waktu" value={`${stats.on_time || 0} hari`} icon={CheckCircle2} tone="emerald" />
                        <SummaryCard label="Terlambat" value={`${stats.late || 0} hari`} icon={Clock} tone="amber" />
                        <SummaryCard label="Alpha" value={`${stats.absent || 0} hari`} icon={XCircle} tone="rose" />
                    </div>
                </div>
            </section>

            {/* 1. Latest announcements */}
            <section>
                <SectionHeading title="Pengumuman Terbaru" subtitle="Informasi terbaru yang perlu Anda ketahui." />
                {announcements.length ? (
                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                        {announcements.slice(0, 3).map(item => {
                            const attachUrl = item.attachment_full_url || item.attachment_url;
                            const isImage = attachUrl && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attachUrl);
                            const isPdf = attachUrl && /\.pdf(\?|$)/i.test(attachUrl);
                            return (
                                <article key={item.id} className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Bell className="h-5 w-5" /></span><span className="text-xs text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : ''}</span></div>
                                    <h3 className="min-w-0 wrap-anywhere font-bold text-slate-900">{item.title}</h3>
                                    <p className="min-w-0 whitespace-pre-line wrap-anywhere text-sm leading-6 text-slate-600">{item.body || item.content || 'Buka untuk melihat detail pengumuman.'}</p>
                                    {isImage && (
                                        <a href={attachUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
                                            <img src={attachUrl} alt="Lampiran pengumuman" className="max-h-56 w-full rounded-xl border border-slate-100 bg-slate-50 object-contain" />
                                        </a>
                                    )}
                                    {!isImage && attachUrl && (
                                        <a href={attachUrl} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex max-w-full items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                                            <FileText className="h-4 w-4" />
                                            {isPdf ? 'Unduh PDF' : 'Unduh Lampiran'}
                                        </a>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : <EmptyCard text="Belum ada pengumuman terbaru." />}
            </section>

            {/* 1b. Company events published by admin */}
            <section>
                <SectionHeading
                    title="Agenda Perusahaan"
                    subtitle="Event dan kegiatan yang tersedia dari admin."
                    action={<div className="flex flex-wrap gap-2"><button onClick={activateEventAlarm} className={`rounded-xl px-4 py-2 text-sm font-bold ${alarmEnabled ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-amber-500 text-white'}`}>{alarmEnabled ? 'Alarm aktif' : 'Aktifkan alarm'}</button><Link to="/employee/calendar" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Lihat kalender</Link></div>}
                />
                {alarmMessage && <p className="mt-3 text-sm text-slate-500">{alarmMessage}</p>}
                {calendarEvents.length ? (() => {
                    const events = [...calendarEvents].sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0));
                    const nextEvent = events[0];
                    return <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
                        <article className="min-w-0 overflow-hidden rounded-3xl border border-blue-200 bg-linear-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                                <div className="w-fit shrink-0 rounded-2xl bg-white px-5 py-3 text-center text-blue-700 shadow-sm"><span className="block text-4xl font-black leading-none">{eventDay(nextEvent.start_date)}</span><span className="mt-1 block text-xs font-black tracking-widest">{eventMonth(nextEvent.start_date)}</span></div>
                                <div className="min-w-0"><span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-100">Event berikutnya</span><h3 className="mt-3 wrap-anywhere text-2xl font-black leading-tight sm:text-3xl">{nextEvent.title}</h3><p className="mt-3 text-sm font-semibold text-blue-100">{eventDate(nextEvent.start_date)}{nextEvent.end_date && nextEvent.end_date !== nextEvent.start_date ? ` – ${eventDate(nextEvent.end_date)}` : ''}</p>{(nextEvent.start_time || nextEvent.end_time) && <p className="mt-1 text-sm text-blue-100">{nextEvent.start_time || ''}{nextEvent.end_time ? ` – ${nextEvent.end_time}` : ''}</p>}</div>
                            </div>
                            {nextEvent.description && <p className="mt-6 whitespace-pre-line wrap-anywhere border-t border-white/15 pt-5 text-sm leading-6 text-blue-50">{nextEvent.description}</p>}
                        </article>
                        <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><h3 className="font-black text-slate-900">Agenda selanjutnya</h3><CalendarDays className="h-5 w-5 text-blue-600" /></div><div className="mt-4 space-y-3">{events.slice(1, 4).map(event => <div key={event.id} className="flex min-w-0 gap-3 rounded-2xl bg-slate-50 p-3"><div className="w-12 shrink-0 rounded-xl bg-blue-100 py-2 text-center text-blue-700"><span className="block text-lg font-black leading-none">{eventDay(event.start_date)}</span><span className="text-[10px] font-black tracking-wider">{eventMonth(event.start_date)}</span></div><div className="min-w-0"><p className="wrap-anywhere text-sm font-bold text-slate-800">{event.title}</p><p className="mt-1 text-xs text-slate-500">{event.start_time || 'Waktu belum ditentukan'}</p></div></div>)}{events.length === 1 && <p className="text-sm text-slate-500">Belum ada agenda lain yang akan datang.</p>}</div></div>
                    </div>;
                })() : <EmptyCard text="Belum ada event perusahaan yang tersedia." />}
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
                                    {index > 0 && <div className="flex flex-wrap gap-2">
                                        {!hasCheckedIn && !ended && status !== 'absent' && <button onClick={() => openAttendance('check-in', shift)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Check In</button>}
                                        {hasCheckedIn && !hasCheckedOut && <button onClick={() => openAttendance('check-out', shift)} disabled={!ended} title={!ended ? `Check Out tersedia mulai pukul ${shift.end_time}` : ''} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${ended ? 'bg-slate-900 text-white' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}>{ended ? 'Check Out' : `Keluar mulai ${shift.end_time}`}</button>}
                                    </div>}
                                </div>
                            </article>
                        );
                    }) : <EmptyCard text="Tidak ada shift yang dijadwalkan hari ini." />}
                </div>
            </section>

            <MobileAppDownloadCard audience="karyawan" />

            {/* 5. Quick access stays last */}
            <section>
                <SectionHeading title="Akses Cepat" subtitle="Tindakan utama ada di depan; fitur lain tetap mudah ditemukan." />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    {quickLinks.map(([href, label, Icon], index) => <Link key={href} to={href} className={`rounded-2xl border p-4 text-center shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${index < 3 ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'}`}><Icon className={`mx-auto h-6 w-6 ${index < 3 ? 'text-emerald-700' : 'text-slate-500'}`} /><span className="mt-3 block text-xs font-bold text-slate-700">{label}</span>{index < 3 && <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Prioritas</span>}</Link>)}
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
