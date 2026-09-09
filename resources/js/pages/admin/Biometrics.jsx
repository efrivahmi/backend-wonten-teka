import React, { useEffect, useState } from 'react';
import { Fingerprint, Loader2, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../../api';

export default function Biometrics() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState('');
    const load = async () => {
        setLoading(true);
        try { const response = await api.get('/admin/biometrics', { params: { search } }); setItems(response.data.data || []); }
        catch (e) { setMessage(e.response?.data?.message || 'Data biometrik gagal dimuat.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);
    const reset = async employee => {
        if (!window.confirm(`Reset data wajah ${employee.full_name}? Karyawan harus merekam ulang tiga pose.`)) return;
        try { const response = await api.delete(`/admin/biometrics/${employee.id}/reset`); setMessage(response.data.message); await load(); }
        catch (e) { setMessage(e.response?.data?.message || 'Data wajah gagal direset.'); }
    };
    return <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">
        <div><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700"><Fingerprint/></div><h1 className="text-3xl font-bold text-slate-900">Biometrik Karyawan</h1></div><p className="text-slate-500 mt-2">Tinjau kelengkapan pose dan buka pendaftaran ulang saat verifikasi wajah bermasalah.</p></div>
        <form onSubmit={e => {e.preventDefault(); load();}} className="flex gap-2 bg-white border rounded-2xl p-3"><Search className="m-2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 outline-none" placeholder="Cari nama atau NIP"/><button className="px-4 py-2 rounded-xl bg-emerald-700 text-white">Cari</button><button type="button" onClick={load} className="p-2"><RefreshCw/></button></form>
        {message && <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">{message}</div>}
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-emerald-700"/></div> : <div className="bg-white border rounded-2xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-4 text-left">Karyawan</th><th className="p-4 text-left">Mobile</th><th className="p-4 text-left">Website</th><th className="p-4 text-left">Terakhir direkam</th><th className="p-4 text-right">Pemulihan</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t"><td className="p-4"><strong className="block">{item.full_name}</strong><span className="text-slate-500">{item.employee_number} • {item.department || 'Tanpa departemen'}</span></td><td className="p-4"><Pose count={item.mobile_pose_count}/></td><td className="p-4"><Pose count={item.web_pose_count}/></td><td className="p-4 text-slate-600">{item.enrolled_at ? new Date(item.enrolled_at).toLocaleString('id-ID') : 'Belum terdaftar'}</td><td className="p-4 text-right"><button disabled={!item.face_enrolled} onClick={() => reset(item)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 disabled:opacity-40"><Trash2 className="h-4 w-4"/>Reset & rekam ulang</button></td></tr>)}</tbody></table></div>}
    </div>;
}

const Pose = ({count}) => <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${count >= 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><ShieldCheck className="h-4 w-4"/>{count}/3 pose</span>;
