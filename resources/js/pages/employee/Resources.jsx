import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, ClipboardList, Loader2, Plane, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../api';

const resources = {
    shifts: { title: 'Jadwal & Shift', description: 'Jadwal kerja yang ditugaskan kepada Anda.', endpoint: '/shifts/upcoming', icon: CalendarDays, keys: ['data', 'shifts'] },
    calendar: { title: 'Kalender Perusahaan', description: 'Hari libur dan agenda perusahaan.', endpoint: '/calendar', icon: CalendarDays, keys: ['data', 'events'] },
    announcements: { title: 'Pengumuman', description: 'Informasi terbaru dari perusahaan.', endpoint: '/announcements', icon: Bell, keys: ['data', 'announcements'] },
    tasks: { title: 'Tugas Pribadi', description: 'Kelola daftar pekerjaan harian Anda.', endpoint: '/tasks', icon: ClipboardList, keys: ['data', 'tasks'], crud: true },
    adjustments: { title: 'Koreksi Absensi', description: 'Riwayat pengajuan perbaikan catatan absensi.', endpoint: '/attendance/adjustment', icon: CheckCircle2, keys: ['data', 'requests'] },
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

    const visibleFields = useMemo(() => ['title', 'name', 'full_name', 'department', 'position', 'phone', 'description', 'content', 'status', 'date', 'start_date', 'end_date', 'start_time', 'end_time', 'created_at'], []);

    return <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-6 w-6" /></div><h1 className="text-2xl md:text-3xl font-bold text-slate-900">{config.title}</h1></div><p className="mt-2 text-slate-500">{config.description}</p></div>
            <div className="flex gap-2">
                {config.markAll && <button onClick={async () => { await api.post('/notifications/read-all'); await load(); }} className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold">Tandai sudah dibaca</button>}
                <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600" aria-label="Muat ulang"><RefreshCw className="h-5 w-5" /></button>
            </div>
        </div>
        {config.crud && <form onSubmit={createTask} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3"><input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Tambahkan tugas baru" className="flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"/><button className="px-5 rounded-xl bg-emerald-700 text-white font-semibold">Tambah</button></form>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : items.length === 0 ? <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center text-slate-500">Belum ada data.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{items.map((item, index) => <article key={item.id ?? index} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg">{item.title || item.name || item.full_name || item.type || `Data ${index + 1}`}</h2>
            <div className="mt-3 space-y-2">{visibleFields.filter(field => item[field] !== undefined && field !== 'title' && field !== 'name').slice(0, 5).map(field => <div key={field} className="flex justify-between gap-4 text-sm"><span className="capitalize text-slate-400">{field.replaceAll('_', ' ')}</span><span className="text-right text-slate-700 font-medium line-clamp-2">{valueText(item[field])}</span></div>)}</div>
            {config.crud && <div className="mt-4 pt-4 border-t flex justify-end gap-2"><button onClick={() => completeTask(item)} className="p-2 rounded-lg bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4"/></button><button onClick={() => deleteTask(item)} className="p-2 rounded-lg bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4"/></button></div>}
        </article>)}</div>}
    </div>;
}
