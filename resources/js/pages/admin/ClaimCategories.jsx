import React, { useEffect, useState } from 'react';
import { Banknote, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api';

const blank = { name: '', monthly_limit: 0, requires_receipt: true, is_active: true };

export default function ClaimCategories() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(blank);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        try {
            const r = await api.get('/admin/claim-categories');
            setItems(r.data || []);
        } catch (x) {
            console.error(x);
        }
    };

    useEffect(() => { load(); }, []);

    const save = async e => {
        e.preventDefault();
        setError('');
        try {
            if (editing) {
                await api.put(`/admin/claim-categories/${editing.id}`, form);
            } else {
                await api.post('/admin/claim-categories', form);
            }
            setOpen(false);
            setEditing(null);
            setForm(blank);
            await load();
        } catch (x) {
            setError(Object.values(x.response?.data?.errors || {})?.[0]?.[0] || x.response?.data?.message || 'Gagal menyimpan jenis klaim.');
        }
    };

    const edit = x => {
        setEditing(x);
        setForm({ ...blank, ...x });
        setOpen(true);
    };

    const remove = async x => {
        if (confirm(`Hapus ${x.name}?`)) {
            try {
                await api.delete(`/admin/claim-categories/${x.id}`);
                await load();
            } catch (x) {
                alert(x.response?.data?.message || 'Gagal menghapus jenis klaim.');
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="mx-auto max-w-6xl space-y-5 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Jenis Klaim / Reimburse</h1>
                    <p className="text-slate-500">Tentukan kategori klaim yang bisa diajukan karyawan beserta limit saldo per bulannya.</p>
                </div>
                <button onClick={() => { setEditing(null); setForm(blank); setOpen(true); }} className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white">
                    <Plus size={18} />Tambah Jenis Klaim
                </button>
            </div>
            {error && <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
            
            {open && (
                <form onSubmit={save} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <label className="text-sm font-semibold text-slate-700">
                        Nama Kategori Klaim
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Transportasi" className="mt-2 w-full rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 p-3" />
                    </label>
                    
                    <label className="text-sm font-semibold text-slate-700">
                        Limit Saldo per Bulan (Rp)
                        <input type="number" min="0" value={form.monthly_limit || 0} onChange={e => setForm({ ...form, monthly_limit: Number(e.target.value) })} placeholder="0 untuk tanpa limit" className="mt-2 w-full rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 p-3" />
                        <small className="mt-1 block font-normal text-slate-500">Isi 0 jika klaim ini tidak memiliki batasan (unlimited).</small>
                    </label>
                    
                    <div className="flex flex-wrap gap-5 md:col-span-2 pt-2">
                        {[
                            ['requires_receipt', 'Wajib melampirkan bukti/struk pembayaran'],
                            ['is_active', 'Aktif dan bisa diajukan karyawan']
                        ].map(([k, l]) => (
                            <label key={k} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={Boolean(form[k])} onChange={e => setForm({ ...form, [k]: e.target.checked })} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                {l}
                            </label>
                        ))}
                    </div>
                    
                    <div className="flex gap-3 md:col-span-2 mt-2">
                        <button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 transition-colors">Simpan</button>
                        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-5 py-3 hover:bg-slate-50 transition-colors">Batal</button>
                    </div>
                </form>
            )}
            
            <div className="grid gap-4 md:grid-cols-2">
                {items.map(x => (
                    <article key={x.id} className="flex justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
                        <div className="flex gap-4">
                            <div className="h-fit rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-emerald-600">
                                <Banknote size={24} />
                            </div>
                            <div>
                                <b className="text-slate-900 text-lg">{x.name}</b>
                                <p className="mt-1 text-sm text-slate-500">
                                    {x.requires_receipt ? 'Wajib struk/nota' : 'Tanpa struk'}
                                </p>
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Limit Bulanan</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {x.monthly_limit > 0 ? formatCurrency(x.monthly_limit) : 'Tanpa Limit'}
                                    </p>
                                </div>
                                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${x.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {x.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => edit(x)} className="h-fit p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                                <Pencil size={18} />
                            </button>
                            <button onClick={() => remove(x)} className="h-fit p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </article>
                ))}
                {items.length === 0 && !open && (
                    <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                        <p className="text-slate-500">Belum ada Jenis Klaim. Silakan tambahkan kategori klaim pertama Anda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
