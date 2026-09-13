import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, ClipboardList, Loader2, Plane, Plus, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../api';

const resources = {
    shifts: { title: 'Jadwal & Shift', description: 'Jadwal kerja yang ditugaskan kepada Anda.', endpoint: '/shifts/upcoming', icon: CalendarDays, keys: ['data', 'shifts'] },
    calendar: { title: 'Kalender Perusahaan', description: 'Hari libur dan agenda perusahaan.', endpoint: '/calendar', icon: CalendarDays, keys: ['data', 'events'] },
    announcements: { title: 'Pengumuman', description: 'Informasi terbaru dari perusahaan.', endpoint: '/announcements', icon: Bell, keys: ['data', 'announcements'] },
    tasks: { title: 'Tugas Pribadi', description: 'Kelola daftar pekerjaan harian Anda.', endpoint: '/tasks', icon: ClipboardList, keys: ['data', 'tasks'], crud: true },
    adjustments: { title: 'Koreksi Absensi', description: 'Untuk mengajukan perbaikan jika lupa check-in/check-out, waktu salah, atau status kehadiran tidak sesuai. Admin yang memeriksa dan menyetujuinya.', endpoint: '/attendance/adjustment', icon: CheckCircle2, keys: ['data', 'requests'] },
    trips: { title: 'Perjalanan Dinas', description: 'Riwayat pengajuan perjalanan dinas.', endpoint: '/attendance/business-trip', icon: Plane, keys: ['data', 'requests'] },
    notifications: { title: 'Notifikasi', description: 'Aktivitas terbaru yang memerlukan perhatian Anda.', endpoint: '/notifications', icon: Bell, keys: ['data', 'notifications'], markAll: true },
    directory: { title: 'Direktori Karyawan', description: 'Kontak dan struktur tim aktif.', endpoint: '/employee/directory', icon: ClipboardList, keys: ['data'] },
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

const valueText = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return Array.isArray(value) ? value.join(', ') : '';
    return String(value).replaceAll('_', ' ');
};

export default function EmployeeResources({ type }) {
    const config = resources[type] || resources.notifications;
    const Icon = config.icon;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [taskName, setTaskName] = useState('');
    const [tripOpen, setTripOpen] = useState(false);
    const [trip, setTrip] = useState({ start_date: '', end_date: '', location: '', description: '' });

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
        if (!taskName.trim()) return;
        try {
            await api.post('/tasks', {
                title: taskName.trim(),
                task_date: new Date().toISOString().slice(0, 10),
            });
            setTaskName(''); await load();
        } catch (e) { setError(e.response?.data?.message || 'Tugas gagal ditambahkan.'); }
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

    const visibleFields = useMemo(() => ['title', 'name', 'full_name', 'department', 'position', 'phone', 'description', 'content', 'status', 'date', 'start_date', 'end_date', 'start_time', 'end_time', 'created_at'], []);
    const calendarCells = useMemo(() => {
        const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return [...Array((first.getDay() + 6) % 7).fill(null), ...Array.from({length: count}, (_, i) => i + 1)];
    }, [type]);

    return <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-6 w-6" /></div><h1 className="text-2xl md:text-3xl font-bold text-slate-900">{config.title}</h1></div><p className="mt-2 text-slate-500">{config.description}</p></div>
            <div className="flex gap-2">
                {type === 'trips' && <button onClick={() => setTripOpen(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Ajukan perjalanan</button>}
                {config.markAll && <button onClick={async () => { await api.post('/notifications/read-all'); await load(); }} className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold">Tandai sudah dibaca</button>}
                <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600" aria-label="Muat ulang"><RefreshCw className="h-5 w-5" /></button>
            </div>
        </div>
        {config.crud && <form onSubmit={createTask} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3"><input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Tambahkan tugas baru" className="flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"/><button className="px-5 rounded-xl bg-emerald-700 text-white font-semibold">Tambah</button></form>}
        {type === 'trips' && tripOpen && <form onSubmit={createTrip} className="grid gap-4 rounded-2xl border border-emerald-200 bg-white p-5 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Mulai<input type="date" required value={trip.start_date} onChange={e => setTrip({...trip,start_date:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold text-slate-700">Selesai<input type="date" required min={trip.start_date} value={trip.end_date} onChange={e => setTrip({...trip,end_date:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><input required placeholder="Lokasi tujuan" value={trip.location} onChange={e => setTrip({...trip,location:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2"/><textarea required placeholder="Tujuan dan keterangan perjalanan" value={trip.description} onChange={e => setTrip({...trip,description:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2"/><button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white md:col-span-2">Kirim untuk persetujuan admin</button></form>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : type === 'calendar' ? <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-5 text-xl font-bold text-slate-800">{new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</h2><div className="grid grid-cols-7 gap-1 text-center">{['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(day=><div key={day} className="py-2 text-xs font-bold text-slate-400">{day}</div>)}{calendarCells.map((day,index)=>{const events=day ? items.filter(item=>new Date(item.start_date).getDate()===day) : []; return <div key={index} className={`min-h-24 rounded-lg border p-2 text-left ${day?'border-slate-100':'border-transparent'}`}>{day&&<><span className="text-sm font-semibold text-slate-700">{day}</span>{events.map(event=><div key={event.id} className="mt-1 rounded bg-emerald-50 px-1.5 py-1 text-[11px] font-semibold text-emerald-800">{event.start_time?.slice(0,5)} {event.title}</div>)}</>}</div>})}</div></div> : items.length === 0 ? <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center text-slate-500">Belum ada data.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{items.map((item, index) => <article key={item.id ?? index} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg">{item.title || item.name || item.full_name || item.type || `Data ${index + 1}`}</h2>
            <div className="mt-3 space-y-2">{visibleFields.filter(field => item[field] !== undefined && field !== 'title' && field !== 'name').slice(0, 5).map(field => <div key={field} className="flex justify-between gap-4 text-sm"><span className="capitalize text-slate-400">{field.replaceAll('_', ' ')}</span><span className="text-right text-slate-700 font-medium line-clamp-2">{valueText(item[field])}</span></div>)}</div>
            {config.crud && <div className="mt-4 pt-4 border-t flex justify-end gap-2"><button onClick={() => completeTask(item)} className="p-2 rounded-lg bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4"/></button><button onClick={() => deleteTask(item)} className="p-2 rounded-lg bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4"/></button></div>}
        </article>)}</div>}
    </div>;
}
