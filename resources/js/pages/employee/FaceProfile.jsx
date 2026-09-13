import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function FaceProfile() {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [error, setError] = useState('');
    const load = async () => {
        setError('');
        try {
            const response = await api.get('/biometrics/status');
            setStatus(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Data wajah belum dapat dimuat.');
        }
    };
    useEffect(() => { load(); }, []);
    if (!status && !error) return <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-emerald-700" /></div>;
    const available = status?.web?.available === true;
    const date = status?.enrolled_at ? new Date(status.enrolled_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : 'Belum pernah diperbarui';

    return <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Biometrik pribadi</p><h1 className="text-3xl font-bold text-slate-900 mt-1">Data Wajah Saya</h1><p className="text-slate-500 mt-2">Periksa dan perbarui wajah ketika perubahan fisik membuat absensi sulit dikenali.</p></div>
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700"><p>{error}</p><button onClick={load} className="mt-4 inline-flex items-center gap-2 font-semibold"><RefreshCw className="h-4 w-4" /> Coba lagi</button></div> :
            <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-6 items-center"><div className={`h-48 w-40 rounded-[2rem] flex items-center justify-center ${available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}><ShieldCheck className="h-20 w-20" /></div><div className="flex-1 text-center sm:text-left"><div className="flex items-center justify-center sm:justify-start gap-2">{available && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}<h2 className="text-xl font-bold text-slate-900">{available ? 'Wajah website sudah terdaftar' : 'Wajah website belum lengkap'}</h2></div><p className="text-slate-600 mt-3">{status?.web?.pose_count || 0} pose tersimpan</p><p className="text-sm text-slate-500 mt-1">Terakhir diperbarui: {date}</p><p className="text-xs text-slate-500 mt-4">Sistem menyimpan descriptor wajah terenkripsi, bukan foto mentah.</p></div></div>
                <button onClick={() => navigate('/employee/face-enrollment')} className="mt-8 w-full rounded-xl bg-emerald-700 px-5 py-3.5 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-800"><Camera className="h-5 w-5" /> {available ? 'Ganti Wajah Terdaftar' : 'Daftarkan Wajah Sekarang'}</button>
            </div>}
    </div>;
}
