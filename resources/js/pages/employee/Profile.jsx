import React, { useEffect, useState } from 'react';
import { Loader2, Save, UserRound } from 'lucide-react';
import api from '../../api';

export default function Profile() {
    const [form, setForm] = useState({ full_name: '', email: '', phone: '', address: '', npwp: '', ptkp_status: 'TK/0', bpjs_kesehatan_number: '', bpjs_ketenagakerjaan_number: '', bank_name: '', bank_account_number: '', bank_account_holder: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        api.get('/me').then(({ data }) => {
            const user = data.user || data;
            const employee = user.employee || {};
            setForm({
                full_name: employee.full_name || user.name || '', email: employee.email || user.email || '', phone: employee.phone || '', address: employee.address || '',
                npwp: employee.npwp || '', ptkp_status: employee.ptkp_status || 'TK/0',
                bpjs_kesehatan_number: employee.bpjs_kesehatan_number || '', bpjs_ketenagakerjaan_number: employee.bpjs_ketenagakerjaan_number || '',
                bank_name: employee.bank_name || '', bank_account_number: employee.bank_account_number || '', bank_account_holder: employee.bank_account_holder || '',
            });
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
        <form onSubmit={submit} className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4"><img src="/images/lemdiklat-logo.png" className="h-20 w-20 object-contain" alt="Logo Lemdiklat" /><div><UserRound className="mb-1 h-5 w-5 text-emerald-700"/><p className="font-bold text-slate-800">e-Absensi Lemdiklat Taruna Nusantara Indonesia</p></div></div>
            <div className="grid gap-5 md:grid-cols-2">
                {[['full_name','Nama lengkap','text'],['email','Email','email'],['phone','Nomor telepon','tel']].map(([name,label,type]) => <label key={name} className="text-sm font-semibold text-slate-700">{label}<input type={type} required={name !== 'phone'} value={form[name]} onChange={e => setForm({...form,[name]:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>)}
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">Alamat<textarea rows="4" value={form.address} onChange={e => setForm({...form,address:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
            </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Data Penggajian</h2>
                <p className="mt-1 text-sm text-slate-500">Lengkapi status pajak, kepesertaan BPJS, dan rekening penerima gaji. Gaji pokok serta perhitungan tetap dikelola admin.</p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">Nomor NPWP (opsional)<input inputMode="numeric" value={form.npwp} onChange={e=>setForm({...form,npwp:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
                    <label className="text-sm font-semibold text-slate-700">Status PTKP<select value={form.ptkp_status} onChange={e=>setForm({...form,ptkp_status:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-600">{['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3','K/I/0','K/I/1','K/I/2','K/I/3'].map(status=><option key={status} value={status}>{status}</option>)}</select></label>
                    <label className="text-sm font-semibold text-slate-700">Nomor BPJS Kesehatan (opsional)<input inputMode="numeric" value={form.bpjs_kesehatan_number} onChange={e=>setForm({...form,bpjs_kesehatan_number:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
                    <label className="text-sm font-semibold text-slate-700">Nomor BPJS Ketenagakerjaan (opsional)<input inputMode="numeric" value={form.bpjs_ketenagakerjaan_number} onChange={e=>setForm({...form,bpjs_ketenagakerjaan_number:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
                    <label className="text-sm font-semibold text-slate-700">Nama Bank<input value={form.bank_name} onChange={e=>setForm({...form,bank_name:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
                    <label className="text-sm font-semibold text-slate-700">Nomor Rekening<input inputMode="numeric" value={form.bank_account_number} onChange={e=>setForm({...form,bank_account_number:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
                    <label className="text-sm font-semibold text-slate-700 md:col-span-2">Nama Pemilik Rekening<input value={form.bank_account_holder} onChange={e=>setForm({...form,bank_account_holder:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600" /></label>
                </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
            <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Simpan perubahan</button>
            </section>
        </form>
    </div>;
}
