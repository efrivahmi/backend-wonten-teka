import React, { useEffect, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import Pagination from '../../components/Pagination';
import api from '../../api';

const blank = { name:'', code:'', quota_per_month:1, is_paid:true, requires_attachment:false, is_active:true };

export default function LeaveTypes(){
    const [items,setItems]=useState([]),[form,setForm]=useState(blank),[editing,setEditing]=useState(null),[open,setOpen]=useState(false),[error,setError]=useState('');
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const load=async()=>{const r=await api.get(`/admin/leave-types?page=${currentPage}`);setPagination(r.data.data);setItems(r.data.data?.data||[])};
    useEffect(()=>{load()},[currentPage]);
    const save=async e=>{e.preventDefault();setError('');try{editing?await api.put(`/admin/leave-types/${editing.id}`,form):await api.post('/admin/leave-types',form);setOpen(false);setEditing(null);setForm(blank);await load()}catch(x){setError(Object.values(x.response?.data?.errors||{})?.[0]?.[0]||x.response?.data?.message||'Gagal menyimpan jenis cuti.')}};
    const edit=x=>{setEditing(x);setForm({...blank,...x});setOpen(true)};
    const remove=async x=>{if(confirm(`Hapus ${x.name}?`)){await api.delete(`/admin/leave-types/${x.id}`);await load()}};
    return <div className="mx-auto max-w-6xl space-y-5 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Jenis Cuti & Kuota</h1><p className="text-slate-500">Tentukan jumlah hari cuti yang diberikan kepada setiap karyawan setiap bulan.</p></div><button onClick={()=>{setEditing(null);setForm(blank);setOpen(true)}} className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white"><Plus size={18}/>Tambah Jenis Cuti</button></div>
        {error&&<p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
        {open&&<form onSubmit={save} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Nama jenis cuti<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Cuti Tahunan" className="mt-2 w-full rounded-xl border p-3"/></label>
            <label className="text-sm font-semibold text-slate-700">Kode<input value={form.code||''} onChange={e=>setForm({...form,code:e.target.value})} placeholder="CTH" className="mt-2 w-full rounded-xl border p-3"/></label>
            <label className="text-sm font-semibold text-slate-700">Kuota per bulan<input type="number" min="0" max="31" required value={form.quota_per_month} onChange={e=>setForm({...form,quota_per_month:Number(e.target.value)})} className="mt-2 w-full rounded-xl border p-3"/><small className="mt-1 block font-normal text-slate-500">Kuota dihitung ulang setiap awal bulan.</small></label>
            <label className="text-sm font-semibold text-slate-700">Maksimal carry over<input type="number" min="0" max="366" disabled={!form.is_carry_over_allowed} value={form.max_carry_over_days||0} onChange={e=>setForm({...form,max_carry_over_days:Number(e.target.value)})} className="mt-2 w-full rounded-xl border p-3 disabled:bg-slate-100"/></label>
            <div className="flex flex-wrap gap-5 md:col-span-2">{[['is_paid','Cuti dibayar'],['requires_attachment','Wajib lampiran'],['is_active','Aktif']].map(([k,l])=><label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form[k])} onChange={e=>setForm({...form,[k]:e.target.checked})}/> {l}</label>)}</div>
            <div className="flex gap-3 md:col-span-2"><button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white">Simpan</button><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border px-5 py-3">Batal</button></div>
        </form>}
        <div className="grid gap-4 md:grid-cols-2">{items.map(x=><article key={x.id} className="flex justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex gap-3"><div className="h-fit rounded-xl bg-emerald-100 p-3 text-emerald-700"><CalendarDays/></div><div><b className="text-slate-900">{x.name}</b><p className="mt-1 text-sm text-slate-500">{x.code||'Tanpa kode'} · {x.is_paid?'Dibayar':'Tidak dibayar'}</p><p className="mt-3 text-2xl font-bold text-emerald-700">{x.quota_per_month} <span className="text-sm font-medium text-slate-500">hari/bulan</span></p><span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${x.is_active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{x.is_active?'Aktif':'Nonaktif'}</span></div></div><div className="flex"><button onClick={()=>edit(x)} className="h-fit p-2 text-blue-700" title="Edit"><Pencil/></button><button onClick={()=>remove(x)} className="h-fit p-2 text-rose-700" title="Hapus"><Trash2/></button></div></article>)}</div>
        <Pagination pagination={pagination} onPageChange={setCurrentPage} />
    </div>
}
