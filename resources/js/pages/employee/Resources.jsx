import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, ClipboardList, Loader2, Plane, Plus, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../api';

const resources = {
    shifts: { title: 'Jadwal & Shift', description: 'Jadwal kerja yang ditugaskan kepada Anda.', endpoint: '/shifts/upcoming', icon: CalendarDays, keys: ['data', 'shifts'] },
    calendar: { title: 'Kalender Perusahaan', description: 'Hari libur dan agenda perusahaan.', endpoint: '/calendar', icon: CalendarDays, keys: ['data', 'events'] },
    tasks: { title: 'Tugas Pribadi', description: 'Kelola daftar pekerjaan harian Anda.', endpoint: '/tasks', icon: ClipboardList, keys: ['data', 'tasks'], crud: true },
    adjustments: { title: 'Pengajuan Lupa Absensi', description: 'Tambahkan pengajuan ketika lupa mengisi check-in atau check-out. Pengajuan yang sudah dikirim hanya dapat dilihat dan tidak bisa diedit atau dihapus.', endpoint: '/attendance/adjustment', icon: CheckCircle2, keys: ['data', 'requests'] },
    trips: { title: 'Perjalanan Dinas', description: 'Riwayat pengajuan perjalanan dinas.', endpoint: '/attendance/business-trip', icon: Plane, keys: ['data', 'requests'] },
    notifications: { title: 'Notifikasi', description: 'Aktivitas terbaru yang memerlukan perhatian Anda.', endpoint: '/notifications', icon: Bell, keys: ['data', 'notifications'], markAll: true },
};

const collectItems = (payload, keys) => {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
        const value = payload?.[key];
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.data)) return value.data;
    }
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
};

const DATE_FIELDS = new Set(['start_date', 'end_date', 'date', 'original_date', 'proposed_date', 'created_at', 'updated_at']);
const DATETIME_FIELDS = new Set(['created_at', 'updated_at', 'check_in', 'check_out']);

const fmtDate = (raw, key) => {
    if (raw === null || raw === undefined || raw === '') return '—';
    const s = String(raw);
    // Deteksi ISO datetime atau date string
    const isDateLike = DATE_FIELDS.has(key) || /^\d{4}-\d{2}-\d{2}/.test(s);
    if (!isDateLike) return s.replaceAll('_', ' ');
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return s;
    // Jika berisi jam (punya T dan bukan 00:00), tampilkan juga jam
    const hasTime = s.includes('T') && !/T00:00:00/.test(s);
    return dt.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
};

const valueText = (value, key = '') => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return Array.isArray(value) ? value.join(', ') : '';
    return fmtDate(value, key);
};

export default function EmployeeResources({ type }) {
    const config = resources[type] || resources.notifications;
    const Icon = config.icon;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [taskName, setTaskName] = useState('');
    const [savingTask, setSavingTask] = useState(false);
    const [taskMessage, setTaskMessage] = useState('');
    const [tripOpen, setTripOpen] = useState(false);
    const [trip, setTrip] = useState({ start_date: '', end_date: '', location: '', description: '' });
    const [adjustmentOpen, setAdjustmentOpen] = useState(false);
    const [adjustment, setAdjustment] = useState({ date: '', check_in: '', check_out: '', reason: '' });
    const [selectedEvent, setSelectedEvent] = useState(null);

    const load = async () => {
        setLoading(true); setError('');
        try {
            const response = await api.get(config.endpoint);
            setItems(collectItems(response.data, config.keys));
        } catch (e) {
            setError(e.response?.data?.message || 'Data belum dapat dimuat. Silakan coba kembali.');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [type]);

    const createTask = async (event) => {
        event.preventDefault();
        setError(''); setTaskMessage('');
        if (!taskName.trim()) {
            setError('Nama tugas wajib diisi sebelum menekan tombol Tambah.');
            return;
        }
        setSavingTask(true);
        try {
            const now = new Date();
            const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            await api.post('/tasks', {
                title: taskName.trim(),
                task_date: localDate,
                is_habit: false,
            });
            setTaskName(''); setTaskMessage('Tugas berhasil ditambahkan.'); await load();
        } catch (e) {
            const validation = Object.values(e.response?.data?.errors || {})?.[0]?.[0];
            setError(validation || e.response?.data?.message || 'Tugas gagal ditambahkan.');
        } finally { setSavingTask(false); }
    };

    const completeTask = async (item) => {
        try { await api.post(`/tasks/${item.id}/complete`); await load(); }
        catch (e) { setError(e.response?.data?.message || 'Status tugas gagal diperbarui.'); }
    };

    const deleteTask = async (item) => {
        try { await api.delete(`/tasks/${item.id}`); await load(); }
        catch (e) { setError(e.response?.data?.message || 'Tugas gagal dihapus.'); }
    };

    const createTrip = async (event) => {
        event.preventDefault(); setError('');
        try {
            await api.post('/attendance/business-trip', trip);
            setTripOpen(false); setTrip({ start_date: '', end_date: '', location: '', description: '' }); await load();
        } catch (e) { setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {})?.[0]?.[0] || 'Pengajuan perjalanan dinas gagal dikirim.'); }
    };

    const createAdjustment = async (event) => {
        event.preventDefault(); setError('');
        try {
            await api.post('/attendance/adjustment', adjustment);
            setAdjustmentOpen(false);
            setAdjustment({ date: '', check_in: '', check_out: '', reason: '' });
            await load();
        } catch (e) { setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {})?.[0]?.[0] || 'Pengajuan lupa absensi gagal dikirim.'); }
    };

    const visibleFields = useMemo(() => ['title', 'name', 'full_name', 'department', 'position', 'phone', 'description', 'content', 'status', 'date', 'check_in', 'check_out', 'reason', 'start_date', 'end_date', 'start_time', 'end_time', 'created_at'], []);
    const calendarCells = useMemo(() => {
        const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return [...Array((first.getDay() + 6) % 7).fill(null), ...Array.from({length: count}, (_, i) => i + 1)];
    }, [type]);

    return <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-6 w-6" /></div><h1 className="text-2xl md:text-3xl font-bold text-slate-900">{config.title}</h1></div><p className="mt-2 text-slate-500">{config.description}</p></div>
            <div className="flex flex-wrap gap-2">
                {type === 'calendar' && items.length > 0 && <button onClick={() => {
                    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Lemdiklat//NONSGML v1.0//EN\n";
                    items.forEach(event => {
                        const uid = `${event.id}@lemdiklat-${Date.now()}`;
                        const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const startDT = new Date(event.start_date + (event.start_time ? 'T'+event.start_time : 'T00:00:00'));
                        const startStr = startDT.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        
                        let endStr = startStr;
                        if (event.end_date) {
                            const endDT = new Date(event.end_date + (event.end_time ? 'T'+event.end_time : 'T23:59:59'));
                            endStr = endDT.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        }
                        
                        ics += "BEGIN:VEVENT\n";
                        ics += `UID:${uid}\nDTSTAMP:${stamp}\nDTSTART:${startStr}\nDTEND:${endStr}\n`;
                        ics += `SUMMARY:${event.title}\n`;
                        if (event.description) ics += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\n`;
                        ics += "END:VEVENT\n";
                    });
                    ics += "END:VCALENDAR";
                    const blob = new Blob([ics], { type: 'text/calendar' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Kalender_Perusahaan_${new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).replace(' ', '_')}.ics`;
                    a.click();
                    URL.revokeObjectURL(url);
                }} className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 bg-white transition">Ekspor ke Kalender (Alarm)</button>}
                {type === 'trips' && <button onClick={() => setTripOpen(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Ajukan perjalanan</button>}
                {type === 'adjustments' && <button onClick={() => setAdjustmentOpen(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Tambah pengajuan</button>}
                {config.markAll && <button onClick={async () => { await api.post('/notifications/read-all'); await load(); }} className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold">Tandai sudah dibaca</button>}
                <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600" aria-label="Muat ulang"><RefreshCw className="h-5 w-5" /></button>
            </div>
        </div>
        {config.crud && <form onSubmit={createTask} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row"><input required aria-label="Nama tugas baru" value={taskName} onChange={e => { setTaskName(e.target.value); if (error) setError(''); }} placeholder="Tambahkan tugas baru" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"/><button type="submit" disabled={savingTask} className="inline-flex min-h-12 items-center justify-center px-5 rounded-xl bg-emerald-700 text-white font-semibold disabled:cursor-wait disabled:opacity-60">{savingTask ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Menyimpan…</> : 'Tambah'}</button></form>}
        {taskMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{taskMessage}</div>}
        {type === 'trips' && tripOpen && <form onSubmit={createTrip} className="grid gap-4 rounded-2xl border border-emerald-200 bg-white p-5 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Mulai<input type="date" required value={trip.start_date} onChange={e => setTrip({...trip,start_date:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold text-slate-700">Selesai<input type="date" required min={trip.start_date} value={trip.end_date} onChange={e => setTrip({...trip,end_date:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><input required placeholder="Lokasi tujuan" value={trip.location} onChange={e => setTrip({...trip,location:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2"/><textarea required placeholder="Tujuan dan keterangan perjalanan" value={trip.description} onChange={e => setTrip({...trip,description:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2"/><button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white md:col-span-2">Kirim untuk persetujuan admin</button></form>}
        {type === 'adjustments' && adjustmentOpen && <form onSubmit={createAdjustment} className="grid gap-4 rounded-2xl border border-emerald-200 bg-white p-5 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700 md:col-span-2">Tanggal lupa absen<input type="date" required max={new Date().toISOString().slice(0,10)} value={adjustment.date} onChange={e => setAdjustment({...adjustment,date:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold text-slate-700">Jam masuk yang seharusnya<input type="time" lang="en-GB" required value={adjustment.check_in} onChange={e => setAdjustment({...adjustment,check_in:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold text-slate-700">Jam keluar yang seharusnya<input type="time" lang="en-GB" required value={adjustment.check_out} onChange={e => setAdjustment({...adjustment,check_out:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold text-slate-700 md:col-span-2">Alasan<textarea required maxLength={500} value={adjustment.reason} onChange={e => setAdjustment({...adjustment,reason:e.target.value})} placeholder="Contoh: lupa melakukan check-out setelah menyelesaikan shift" className="mt-1 block min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white md:col-span-2">Kirim pengajuan</button></form>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : type === 'calendar' ? <div className="space-y-6"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-5 text-xl font-bold text-slate-800">{new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</h2><div className="grid grid-cols-7 gap-1 text-center">{['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(day=><div key={day} className="py-2 text-xs font-bold text-slate-400">{day}</div>)}{calendarCells.map((day,index)=>{const events=day ? items.filter(item=>new Date(item.start_date).getDate()===day) : []; return <div key={index} className={`min-h-24 rounded-lg border p-2 text-left ${day?'border-slate-100':'border-transparent'}`}>{day&&<><span className="text-sm font-semibold text-slate-700">{day}</span>{events.map(event=><div key={event.id} onClick={() => setSelectedEvent(event)} className="mt-1 cursor-pointer hover:bg-emerald-200 rounded bg-emerald-50 px-1.5 py-1 text-[11px] font-semibold text-emerald-800 transition-colors">{event.start_time?.slice(0,5)} {event.title}</div>)}</>}</div>})}</div></div>
        
        {/* Agenda View */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-800">Daftar Agenda</h2>
            {items.length === 0 ? <div className="py-10 text-center text-slate-500">Belum ada agenda bulan ini.</div> : <div className="divide-y divide-slate-100">
                {items.sort((a,b) => new Date(a.start_date) - new Date(b.start_date)).map((event) => (
                    <div key={event.id} className="py-4 flex gap-4 cursor-pointer hover:bg-slate-50 rounded-lg px-2 transition-colors" onClick={() => setSelectedEvent(event)}>
                        <div className="flex-shrink-0 w-16 text-center">
                            <div className="text-2xl font-bold text-emerald-700">{new Date(event.start_date).getDate()}</div>
                            <div className="text-xs font-semibold text-slate-500 uppercase">{new Date(event.start_date).toLocaleDateString('id-ID', { month: 'short' })}</div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                            <div className="text-sm text-slate-500 font-medium mt-1">
                                {event.start_time ? event.start_time.slice(0,5) : '00:00'} - {event.end_time ? event.end_time.slice(0,5) : '23:59'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>}
        </div>
        
        {/* Event Detail Modal */}
        {selectedEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-2xl font-bold text-slate-900">{selectedEvent.title}</h3>
                            <button onClick={() => setSelectedEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-xl">
                                <CalendarDays className="h-5 w-5" />
                                <div>
                                    <div className="text-sm font-semibold">{new Date(selectedEvent.start_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    <div className="text-xs opacity-80">{selectedEvent.start_time ? selectedEvent.start_time.slice(0,5) : '00:00'} - {selectedEvent.end_time ? selectedEvent.end_time.slice(0,5) : '23:59'}</div>
                                </div>
                            </div>
                            {selectedEvent.description && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-2">Deskripsi</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-8">
                            <button onClick={() => setSelectedEvent(null)} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800">Tutup</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </div> : type === 'shifts' ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item,index)=>{const shift=item.shift_template||{};const isToday=new Date(item.date).toLocaleDateString('en-CA')===new Date().toLocaleDateString('en-CA');return <article key={item.id??index} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${isToday?'border-emerald-400 ring-2 ring-emerald-100':'border-slate-200'}`}><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold text-slate-900">{shift.name||'Shift Kerja'}</h2><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${shift.category==='Piket'?'bg-orange-100 text-orange-700':shift.category==='Lembur'?'bg-purple-100 text-purple-700':'bg-slate-100 text-slate-700'}`}>{shift.category||'Reguler'}</span>{isToday&&<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Aktif Hari Ini</span>}{item.is_recurring_schedule&&<span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">Mingguan</span>}{item.is_default_schedule&&<span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">Shift Utama</span>}</div></div><CalendarDays className="text-emerald-600"/></div><div className="p-5"><p className="mb-4 text-sm font-semibold text-slate-600">{new Date(`${item.date}T00:00:00`).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p><div className="flex items-center justify-between"><div><small className="uppercase text-slate-400">Jam Masuk</small><p className="font-bold text-slate-900">{shift.start_time?.slice(0,5)||'—'}</p></div><div className="mx-4 h-px flex-1 border-t border-dashed border-slate-300"/><div className="text-right"><small className="uppercase text-slate-400">Jam Keluar</small><p className="font-bold text-slate-900">{shift.end_time?.slice(0,5)||'—'}</p></div></div><div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Toleransi terlambat</span><b>{shift.grace_period_minutes??0} menit</b></div></div></article>})}{items.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500 md:col-span-2 xl:col-span-3">Belum ada shift aktif yang ditugaskan.</div>}</div> : items.length === 0 ? <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center text-slate-500">Belum ada data.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{items.map((item, index) => <article key={item.id ?? index} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg">{item.title || item.name || item.full_name || item.type || `Data ${index + 1}`}</h2>
            <div className="mt-3 space-y-2">{visibleFields.filter(field => item[field] !== undefined && field !== 'title' && field !== 'name').slice(0, 5).map(field => <div key={field} className="flex justify-between gap-4 text-sm"><span className="capitalize text-slate-400">{field.replaceAll('_', ' ')}</span><span className="text-right text-slate-700 font-medium line-clamp-2">{valueText(item[field], field)}</span></div>)}</div>
            {config.crud && <div className="mt-4 pt-4 border-t flex justify-end gap-2"><button onClick={() => completeTask(item)} className="p-2 rounded-lg bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4"/></button><button onClick={() => deleteTask(item)} className="p-2 rounded-lg bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4"/></button></div>}
        </article>)}</div>}
    </div>;
}
