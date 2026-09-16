import React, { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import api from '../../api';

const resources = {
    devices: { title: 'Perangkat', endpoint: '/admin/devices/pending', keys: ['devices', 'data'] },
    events: { title: 'Kalender & Event', endpoint: '/admin/events', keys: ['events', 'data'] },
    payroll: { title: 'Proses Payroll', endpoint: '/admin/payroll/runs', keys: ['runs', 'data'] },
    leaveTypes: { title: 'Jenis Cuti & Izin', endpoint: '/admin/leave-types', keys: ['leave_types', 'data'] },
    securityEvents: { title: 'Deteksi Fake GPS', endpoint: '/admin/attendance-security-events', keys: ['data'] },
};

const extract = (payload, keys) => {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
        const value = payload?.[key];
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.data)) return value.data;
    }
    return Array.isArray(payload?.data?.data) ? payload.data.data : [];
};

export default function AdminOperations({ type }) {
    const config = resources[type] || resources.events;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventForm, setEventForm] = useState({ title: '', description: '', type: 'event', start_date: '', end_date: '', start_time: '', end_time: '' });
    const load = async () => { setLoading(true); setError(''); try { if (type === 'devices') { const [pending, active] = await Promise.all([api.get('/admin/devices/pending'), api.get('/admin/devices/active')]); setItems([...extract(pending.data, config.keys), ...extract(active.data, config.keys)]); } else { const response = await api.get(config.endpoint); setItems(extract(response.data, config.keys)); } } catch (e) { setError(e.response?.data?.message || 'Data gagal dimuat.'); } finally { setLoading(false); } };
    useEffect(() => { load(); }, [type]);
    const action = async (item, value) => {
        try {
            if (type === 'devices') { if (value === 'revoke') await api.post(`/admin/devices/${item.id}/revoke`); else await api.post(`/admin/devices/${item.id}/review`, { action: value }); }
            await load();
        } catch (e) { setError(e.response?.data?.message || 'Tindakan gagal diproses.'); }
    };
    const primaryText = (item) => type === 'devices'
        ? (item.device_name || 'Perangkat tanpa nama')
        : (item.name || item.title || item.employee?.full_name || item.employee_name || `#${item.id}`);
    const secondaryText = (item) => type === 'devices'
        ? `${item.employee?.full_name || 'Karyawan tidak diketahui'} • ${item.device_model || 'Model tidak diketahui'} • ${item.os_version || 'OS tidak diketahui'}`
        : type === 'securityEvents'
            ? `${item.employee?.employee_number || 'Tanpa nomor pegawai'} • ${item.device?.device_name || 'Perangkat tidak dikenal'} • ${item.device?.device_model || 'Model tidak diketahui'} • ${new Date(item.detected_at).toLocaleString('id-ID')}`
            : (item.description || item.date || item.created_at || '—');
    const createEvent = async (event) => {
        event.preventDefault(); setError('');
        try { const payload = {...eventForm, end_date: eventForm.end_date || eventForm.start_date, start_time: eventForm.start_time || null, end_time: eventForm.end_time || null}; if (editingEvent) await api.put(`/admin/events/${editingEvent.id}`, payload); else await api.post('/admin/events', payload); setEventForm({ title: '', description: '', type: 'event', start_date: '', end_date: '', start_time: '', end_time: '' }); setEditingEvent(null); setShowEventForm(false); await load(); }
        catch (e) { setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {})?.[0]?.[0] || 'Event gagal dibuat.'); }
    };
    const editEvent = item => { setEditingEvent(item); setEventForm({title:item.title||'',description:item.description||'',type:item.type||'event',start_date:item.start_date?.slice(0,10)||'',end_date:item.end_date?.slice(0,10)||'',start_time:item.start_time?.slice(0,5)||'',end_time:item.end_time?.slice(0,5)||''}); setShowEventForm(true); };
    const removeEvent = async item => { if (window.confirm(`Hapus “${item.title}”?`)) { await api.delete(`/admin/events/${item.id}`); await load(); } };
    return <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-green-100 text-green-800"><Settings2/></div><div><h1 className="text-3xl font-bold text-slate-900">{config.title}</h1><p className="text-slate-500">Data langsung dari sistem administrasi.</p></div></div><div className="flex gap-2">{type === 'events' && <button onClick={() => setShowEventForm(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Buat event</button>}<button onClick={load} className="p-3 rounded-xl bg-white border"><RefreshCw className="h-5 w-5"/></button></div></div>
        {type === 'events' && showEventForm && <form onSubmit={createEvent} className="grid gap-4 rounded-2xl border border-green-200 bg-white p-5 md:grid-cols-2"><input required placeholder="Judul acara" value={eventForm.title} onChange={e => setEventForm({...eventForm,title:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2"/><select value={eventForm.type} onChange={e => setEventForm({...eventForm,type:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3"><option value="event">Acara</option><option value="meeting">Rapat</option><option value="holiday">Hari libur</option><option value="deadline">Tenggat</option></select><textarea required placeholder="Detail acara" value={eventForm.description} onChange={e => setEventForm({...eventForm,description:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3"/><label className="text-sm font-semibold">Tanggal mulai<input type="date" required value={eventForm.start_date} onChange={e => setEventForm({...eventForm,start_date:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold">Tanggal selesai<input type="date" min={eventForm.start_date} value={eventForm.end_date} onChange={e => setEventForm({...eventForm,end_date:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold">Jam mulai<input type="time" value={eventForm.start_time} onChange={e => setEventForm({...eventForm,start_time:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="text-sm font-semibold">Jam selesai<input type="time" value={eventForm.end_time} onChange={e => setEventForm({...eventForm,end_time:e.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><button className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white md:col-span-2">Publikasikan ke kalender perusahaan</button></form>}
        {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">{error}</div>}
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-green-700"/></div> : <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4 text-left">Data</th><th className="p-4 text-left">Status</th><th className="p-4 text-right">Detail</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id ?? index} className="border-t"><td className="p-4"><strong className="block text-slate-900">{primaryText(item)}</strong><span className="text-slate-500">{secondaryText(item)}</span></td><td className="p-4 capitalize">{type === 'securityEvents' ? 'Absensi ditolak' : String(item.status || 'aktif').replaceAll('_', ' ')}</td><td className="p-4 text-right text-slate-600">{type === 'devices' && (item.status === 'active' ? <button onClick={() => action(item, 'revoke')} className="px-3 py-2 bg-rose-50 text-rose-700 rounded-lg">Cabut akses</button> : <div className="space-x-2"><button onClick={() => action(item, 'approve')} className="px-3 py-2 bg-green-700 text-white rounded-lg">Aktifkan</button><button onClick={() => action(item, 'reject')} className="px-3 py-2 bg-rose-50 text-rose-700 rounded-lg">Tolak</button></div>)}{type === 'events' && <div className="space-x-2"><button onClick={() => editEvent(item)} className="rounded-lg bg-blue-50 p-2 text-blue-700" aria-label="Edit event"><Pencil className="h-4 w-4"/></button><button onClick={() => removeEvent(item)} className="rounded-lg bg-rose-50 p-2 text-rose-700" aria-label="Hapus event"><Trash2 className="h-4 w-4"/></button></div>}{type === 'securityEvents' && <span>{item.attempted_action === 'check_out' ? 'Check Out' : 'Check In'} • {item.latitude}, {item.longitude}</span>}</td></tr>)}</tbody></table>{items.length === 0 && <div className="p-14 text-center text-slate-500">Belum ada data.</div>}</div>}
    </div>;
}
