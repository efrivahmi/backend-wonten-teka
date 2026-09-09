import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Settings2 } from 'lucide-react';
import api from '../../api';

const resources = {
    devices: { title: 'Perangkat', endpoint: '/admin/devices/pending', keys: ['devices', 'data'] },
    events: { title: 'Kalender & Event', endpoint: '/admin/events', keys: ['events', 'data'] },
    payroll: { title: 'Proses Payroll', endpoint: '/admin/payroll/runs', keys: ['runs', 'data'] },
    leaveTypes: { title: 'Jenis Cuti & Izin', endpoint: '/admin/leave-types', keys: ['leave_types', 'data'] },
    flags: { title: 'Flag Absensi', endpoint: '/admin/attendance-flags', keys: ['flags', 'data'] },
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
    const load = async () => { setLoading(true); setError(''); try { const response = await api.get(config.endpoint); setItems(extract(response.data, config.keys)); } catch (e) { setError(e.response?.data?.message || 'Data gagal dimuat.'); } finally { setLoading(false); } };
    useEffect(() => { load(); }, [type]);
    const action = async (item, value) => {
        try {
            if (type === 'devices') await api.post(`/admin/devices/${item.id}/review`, { action: value });
            if (type === 'flags') await api.post(`/admin/attendance-flags/${item.id}/resolve`, { resolution: value, notes: 'Ditinjau melalui dashboard web' });
            await load();
        } catch (e) { setError(e.response?.data?.message || 'Tindakan gagal diproses.'); }
    };
    return <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-green-100 text-green-800"><Settings2/></div><div><h1 className="text-3xl font-bold text-slate-900">{config.title}</h1><p className="text-slate-500">Data langsung dari sistem administrasi.</p></div></div><button onClick={load} className="p-3 rounded-xl bg-white border"><RefreshCw className="h-5 w-5"/></button></div>
        {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">{error}</div>}
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-green-700"/></div> : <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4 text-left">Data</th><th className="p-4 text-left">Status</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id ?? index} className="border-t"><td className="p-4"><strong className="block text-slate-900">{item.name || item.title || item.employee?.full_name || item.employee_name || `#${item.id}`}</strong><span className="text-slate-500">{item.description || item.device_name || item.date || item.created_at || '—'}</span></td><td className="p-4 capitalize">{String(item.status || 'aktif').replaceAll('_', ' ')}</td><td className="p-4 text-right">{type === 'devices' && <div className="space-x-2"><button onClick={() => action(item, 'approve')} className="px-3 py-2 bg-green-700 text-white rounded-lg">Aktifkan</button><button onClick={() => action(item, 'reject')} className="px-3 py-2 bg-rose-50 text-rose-700 rounded-lg">Tolak</button></div>}{type === 'flags' && <button onClick={() => action(item, 'resolved')} className="px-3 py-2 bg-green-700 text-white rounded-lg">Selesaikan</button>}</td></tr>)}</tbody></table>{items.length === 0 && <div className="p-14 text-center text-slate-500">Belum ada data.</div>}</div>}
    </div>;
}
