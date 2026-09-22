import React, { useEffect, useState } from 'react';
import {
    AlertTriangle, Banknote, Bell, Briefcase, CalendarCheck, CalendarDays,
    CalendarRange, CheckSquare, Clock, FileBarChart, FileText, Flag,
    ListChecks, Loader2, MapPin, Shield, Smartphone, Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import MobileAppDownloadCard from '../../components/MobileAppDownloadCard';

const accessGroups = [
    { title: 'SDM & Persetujuan', icon: Users, links: [
        ['Karyawan', '/admin/employees', Users], ['Persetujuan', '/admin/approvals', CheckSquare],
        ['Klaim / Reimburse', '/admin/claims', FileBarChart], ['Jenis Klaim', '/admin/claim-categories', Banknote],
        ['Jenis Cuti', '/admin/leave-types', Briefcase],
    ] },
    { title: 'Presensi', icon: CalendarCheck, links: [
        ['Jadwal & Shift', '/admin/schedule', CalendarRange], ['Penugasan Shift', '/admin/shift-assignments', CalendarRange],
        ['Lokasi Absensi', '/admin/attendance-settings', MapPin], ['Kehadiran Harian', '/admin/attendance-daily', CalendarCheck],
        ['Laporan Absensi', '/admin/reports', FileBarChart], ['Deteksi Fake GPS', '/admin/attendance-security-events', Flag],
    ] },
    { title: 'Operasional', icon: ListChecks, links: [
        ['Perangkat', '/admin/devices', Smartphone], ['Event', '/admin/events', CalendarDays],
        ['Pengumuman', '/admin/announcements', Bell], ['Daily Task & Habit', '/admin/tasks', ListChecks],
        ['Payroll', '/admin/payroll', Banknote], ['Konfigurasi Payroll', '/admin/payroll-config', Banknote],
        ['Biometrik Wajah', '/admin/biometrics', Shield], ['Analitik Departemen', '/admin/department-analytics', FileBarChart],
        ['Pusat Ekspor', '/admin/export', FileBarChart], ['Log Audit', '/admin/audit-logs', Shield],
        ['Pengaturan Perusahaan', '/admin/org-settings', MapPin], ['Pengaturan Sistem', '/admin/settings', Shield],
    ] },
    { title: 'Akun', icon: Shield, links: [['Profil Administrator', '/admin/profile', Shield]] },
];

const SummaryCard = ({ label, value, detail, icon: Icon, tone }) => (
    <div className={`rounded-2xl border p-5 ${tone}`}>
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.12em] opacity-75">{label}</p><Icon className="h-5 w-5" /></div>
        <p className="mt-4 text-3xl font-black tracking-tight">{value}</p>
        {detail && <p className="mt-1 text-xs font-semibold opacity-70">{detail}</p>}
    </div>
);

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [error, setError] = useState('');

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError('');
            const [response, calendarResponse] = await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/calendar').catch(() => ({ data: { events: [] } })),
            ]);
            setStats(response.data.data || {});
            setCalendarEvents(calendarResponse.data?.events || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Dashboard admin belum dapat dimuat.');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchStats(); }, []);

    if (loading || !stats) return <div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

    const employees = stats.employees || { total: 0, recent: [] };
    const attendanceToday = stats.attendance_today || { present: 0, late: 0, on_leave: 0, absent: 0 };
    const attendanceMonth = stats.attendance_month || {};
    const approvals = stats.pending_approvals || { total: 0, leaves: 0, overtimes: 0, claims: 0 };
    const securityEvents = stats.recent_security_events || [];
    const totalEmployees = employees.total || 0;
    const attendancePercentage = totalEmployees ? Math.round((attendanceToday.present / totalEmployees) * 100) : 0;
    const onTime = Math.max(0, (attendanceToday.present || 0) - (attendanceToday.late || 0));
    const statusRows = [['Tepat waktu', onTime, 'bg-emerald-500'], ['Terlambat', attendanceToday.late || 0, 'bg-amber-500'], ['Cuti / izin', attendanceToday.on_leave || 0, 'bg-blue-500'], ['Belum hadir', attendanceToday.absent || 0, 'bg-rose-500']];

    return (
        <div className="mx-auto flex max-w-7xl flex-col space-y-8 p-4 sm:p-6 md:p-8">
            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error} <button onClick={fetchStats} className="ml-2 font-bold underline">Muat ulang</button></div>}

            <header className="border-b border-slate-200 pb-6"><div className="flex items-start gap-4">
                <svg aria-hidden="true" viewBox="0 0 48 48" className="mt-1 h-12 w-12 shrink-0 text-emerald-600"><path d="M24 4 42 14v20L24 44 6 34V14L24 4Z" fill="currentColor" opacity=".12" /><path d="m24 9 13 7v16l-13 7-13-7V16l13-7Z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 27h5v5h6v-9h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>
                <div><p className="teka-kicker text-slate-500">Pusat kendali admin</p><h1 className="teka-display mt-3 text-4xl text-slate-900 sm:text-5xl">Ringkasan operasional</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Pantau kondisi presensi, persetujuan, dan agenda organisasi dari satu halaman.</p></div>
            </div></header>

            <section aria-labelledby="admin-summary-title"><div className="flex items-end justify-between gap-3"><div><h2 id="admin-summary-title" className="text-2xl font-black tracking-tight text-slate-900">Ringkasan hari ini</h2><p className="mt-1 text-sm text-slate-500">Angka utama yang perlu diperhatikan sebelum membuka detail.</p></div><Link to="/admin/reports" className="text-sm font-bold text-emerald-700 hover:underline">Buka laporan →</Link></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Total karyawan" value={totalEmployees} icon={Users} tone="border-blue-100 bg-blue-50 text-blue-800" /><SummaryCard label="Hadir hari ini" value={attendanceToday.present || 0} detail={`${attendancePercentage}% dari karyawan`} icon={CalendarCheck} tone="border-emerald-100 bg-emerald-50 text-emerald-800" /><SummaryCard label="Terlambat" value={attendanceToday.late || 0} icon={Clock} tone="border-amber-100 bg-amber-50 text-amber-800" /><SummaryCard label="Perlu diproses" value={approvals.total || 0} detail="Persetujuan tertunda" icon={FileText} tone="border-rose-100 bg-rose-50 text-rose-800" /></div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-900">Status kehadiran hari ini</h2><p className="mt-1 text-sm text-slate-500">Satu visual ringkas untuk membaca data tabel presensi.</p></div><CalendarCheck className="h-5 w-5 text-emerald-600" /></div><div className="mt-6 space-y-4">{statusRows.map(([label, value, color]) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{label}</span><span className="font-black text-slate-900">{value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${totalEmployees ? Math.min(100, (value / totalEmployees) * 100) : 0}%` }} /></div></div>)}</div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-sm"><div><p className="text-slate-500">Tingkat bulan ini</p><p className="mt-1 text-xl font-black text-slate-900">{attendanceMonth.rate ?? 0}%</p></div><div><p className="text-slate-500">Rata-rata durasi</p><p className="mt-1 text-xl font-black text-slate-900">{Math.floor((attendanceMonth.average_work_minutes || 0) / 60)}j {(attendanceMonth.average_work_minutes || 0) % 60}m</p></div></div></div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-900">Antrean persetujuan</h2><p className="mt-1 text-sm text-slate-500">Buka hanya jika ada tindakan admin.</p></div><CheckSquare className="h-5 w-5 text-rose-600" /></div><div className="mt-6 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-900">{approvals.leaves || 0}</p><p className="mt-1 text-xs font-bold text-slate-500">Cuti</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-900">{approvals.overtimes || 0}</p><p className="mt-1 text-xs font-bold text-slate-500">Lembur</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-900">{approvals.claims || 0}</p><p className="mt-1 text-xs font-bold text-slate-500">Klaim</p></div></div><Link to="/admin/approvals" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">Buka persetujuan</Link></div>
            </section>

            <section className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Agenda perusahaan</h2><p className="mt-1 text-sm text-slate-500">Event yang terlihat oleh karyawan.</p></div><Link to="/admin/events" className="text-sm font-bold text-blue-700 hover:underline">Kelola event →</Link></div>{calendarEvents.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{calendarEvents.slice(0, 3).map(event => <article key={event.id} className="min-w-0 rounded-2xl border border-white bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><CalendarDays className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{event.type || 'Kegiatan'}</p><h3 className="mt-1 wrap-anywhere font-bold text-slate-900">{event.title}</h3></div></div><p className="mt-3 text-sm font-semibold text-slate-700">{event.start_date ? new Date(event.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tanggal belum ditentukan'}</p></article>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white/70 p-6 text-center text-sm text-slate-500">Belum ada event perusahaan.</div>}</section>

            {securityEvents.length > 0 && <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-black text-slate-900">Perlu ditinjau: deteksi fake GPS</h2></div><p className="mt-1 text-sm text-slate-600">{securityEvents.length} kejadian terbaru menunggu pemeriksaan.</p><Link to="/admin/attendance-security-events" className="mt-4 inline-flex rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-700">Tinjau kejadian</Link></section>}

            <MobileAppDownloadCard audience="admin" />

            <section aria-labelledby="quick-access-title"><div><h2 id="quick-access-title" className="text-2xl font-black tracking-tight text-slate-900">Akses cepat admin</h2><p className="mt-1 text-sm text-slate-500">Semua modul tersedia langsung dari dashboard.</p></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{accessGroups.map(group => <div key={group.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 pb-3"><group.icon className="h-5 w-5 text-emerald-700" /><h3 className="font-black text-slate-900">{group.title}</h3></div><div className="mt-3 space-y-1">{group.links.map(([label, href, Icon]) => <Link key={href} to={href} className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></Link>)}</div></div>)}</div></section>
        </div>
    );
};

export default AdminDashboard;
