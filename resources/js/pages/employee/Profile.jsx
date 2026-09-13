import React, { useEffect, useState } from 'react';
import { Loader2, Save, UserRound } from 'lucide-react';
import api from '../../api';

export default function Profile() {
    const [form, setForm] = useState({ full_name: '', email: '', phone: '', address: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        api.get('/me').then(({ data }) => {
            const user = data.user || data;
            const employee = user.employee || {};
            setForm({ full_name: employee.full_name || user.name || '', email: employee.email || user.email || '', phone: employee.phone || '', address: employee.address || '' });
        }).finally(() => setLoading(false));
    }, []);

    const submit = async (event) => {
        event.preventDefault(); setSaving(true); setMessage('');
        try {
            const { data } = await api.put('/employee/profile', form);
            localStorage.setItem('user', JSON.stringify(data.user));
            setMessage('Profil berhasil diperbarui.');
        } catch (error) { setMessage(error.response?.data?.message || 'Profil gagal diperbarui.'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="grid min-h-80 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div>;
    return <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
        <div><h1 className="text-3xl font-bold text-slate-900">Profil & Data Pribadi</h1><p className="mt-1 text-slate-500">Periksa dan perbarui data akun yang dapat Anda ubah.</p></div>
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4"><img src="/images/lemdiklat-logo.png" className="h-20 w-20 object-contain" alt="Logo Lemdiklat" /><div><UserRound className="mb-1 h-5 w-5 text-emerald-700"/><p className="font-bold text-slate-800">e-Absensi Lemdiklat Taruna Nusantara Indonesia</p></div></div>
            <div className="grid gap-5 md:grid-cols-2">
                {[['full_name','Nama lengkap','text'],['email','Email','email'],['phone','Nomor telepon','tel']].map(([name,label,type]) => <label key={name} className="text-sm font-semibold text-slate-700">{label}<input type={type} required={name !== 'phone'} value={form[name]} onChange={e => setForm({...form,[name]:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>)}
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">Alamat<textarea rows="4" value={form.address} onChange={e => setForm({...form,address:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
            </div>
            {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
            <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Simpan perubahan</button>
        </form>
    </div>;
}
