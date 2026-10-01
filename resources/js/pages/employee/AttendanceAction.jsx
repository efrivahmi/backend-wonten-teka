import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Clock3, Loader2, LogIn, LogOut, MapPin, RefreshCw } from 'lucide-react';
import api from '../../api';

const clock = value => value
    ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';

export default function AttendanceAction() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/attendance/today-info');
            setData(response.data || {});
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Status absensi hari ini gagal dimuat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const shifts = data?.shifts || [];
    const doAttendance = (action, shift) => {
        const params = new URLSearchParams({ action });
        if (shift?.assignment_id) params.set('assignment_id', shift.assignment_id);
        if (shift?.template_id) params.set('template_id', shift.template_id);
        navigate(`/employee/attendance?${params.toString()}`);
    };

    return <div className="mx-auto max-w-5xl space-y-5 p-4 pb-8 sm:p-6 xl:p-8">
        <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-green-700 p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-14 -z-10 h-56 w-56 rounded-full border-[28px] border-white/10 sm:h-72 sm:w-72" />
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-emerald-50"><CalendarCheck className="h-4 w-4" /> ABSENSI HARI INI</span>
                    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Catat kehadiran</h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">Pilih shift, lalu lakukan verifikasi wajah dan lokasi. Riwayat kehadiran tersedia terpisah.</p>
                </div>
                <button type="button" onClick={load} aria-label="Muat ulang status absensi" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"><RefreshCw className="h-4 w-4" />Muat ulang</button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/90">
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />GPS dan kamera diperlukan</span>
            </div>
        </header>

        <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="today-shifts-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h2 id="today-shifts-title" className="text-xl font-extrabold text-slate-900 sm:text-2xl">Jadwal shift hari ini</h2><p className="mt-1 text-sm text-slate-500">Status dan tombol absensi ditampilkan untuk tiap shift.</p></div>
                <button type="button" onClick={() => navigate('/employee/attendance')} className="min-h-11 rounded-xl px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">Riwayat absensi <span aria-hidden="true">→</span></button>
            </div>

            {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button onClick={load} className="font-bold underline">Coba lagi</button></div>}
            {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : shifts.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><CalendarCheck className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-bold text-slate-800">Belum ada shift hari ini</p><p className="mt-1 text-sm text-slate-500">Jika jadwal Anda seharusnya tersedia, hubungi administrator.</p></div> : <div className="mt-5 space-y-3">
                {shifts.map((shift, index) => {
                    const attendance = shift.attendance || null;
                    const checkedIn = Boolean(attendance?.check_in_time) && attendance.status !== 'absent';
                    const checkedOut = Boolean(attendance?.check_out_time);
                    const ended = shift.time_status === 'ended';
                    const canCheckIn = !checkedIn && !ended && attendance?.status !== 'absent';
                    const canCheckOut = checkedIn && !checkedOut && ended;
                    const statusLabel = checkedOut ? 'Selesai' : checkedIn ? 'Sudah check-in' : attendance?.status === 'absent' ? 'Tidak hadir' : ended ? 'Jadwal selesai' : shift.time_status_label || 'Belum absen';
                    return <article key={`${shift.assignment_id || shift.template_id || 'shift'}-${index}`} className="grid gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-emerald-50/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-extrabold text-slate-900 sm:text-lg">{shift.name || 'Shift'}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${checkedOut ? 'bg-emerald-100 text-emerald-800' : checkedIn ? 'bg-blue-100 text-blue-800' : attendance?.status === 'absent' || ended ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{statusLabel}</span></div>
                            <p className="mt-1 text-sm text-slate-500">{shift.start_time || '--:--'}–{shift.end_time || '--:--'}{shift.category ? ` · ${shift.category}` : ''}</p>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-1.5"><LogIn className="h-3.5 w-3.5 text-emerald-700" />Masuk {clock(attendance?.check_in_time)}</span><span className="inline-flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5 text-rose-700" />Keluar {clock(attendance?.check_out_time)}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                            {canCheckIn && <button onClick={() => doAttendance('check-in', shift)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:flex-none"><LogIn className="h-4 w-4" />Check in</button>}
                            {checkedIn && !checkedOut && <button onClick={() => canCheckOut && doAttendance('check-out', shift)} disabled={!canCheckOut} title={!canCheckOut ? `Check out tersedia setelah shift berakhir pukul ${shift.end_time || 'sesuai jadwal'}` : undefined} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:flex-none ${canCheckOut ? 'bg-slate-900 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}><LogOut className="h-4 w-4" />{canCheckOut ? 'Check out' : `Keluar ${shift.end_time || 'nanti'}`}</button>}
                            {checkedOut && <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-100 px-4 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Absensi selesai</span>}
                            {!checkedIn && ended && attendance?.status !== 'absent' && <span className="inline-flex min-h-12 items-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-500">Waktu shift berakhir</span>}
                        </div>
                    </article>;
                })}
            </div>}
        </section>
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-950"><strong>Petunjuk:</strong> Izinkan kamera dan lokasi pada browser. Check out aktif setelah jadwal shift berakhir. Jika wajah atau GPS bermasalah, periksa izin perangkat lalu coba kembali.</p>
    </div>;
}
