import React, { useState } from 'react';
import { FileUp, Loader2, Megaphone } from 'lucide-react';
import api from '../../api';

export default function AdminAnnouncements() {
    const [form, setForm] = useState({ title: '', content: '', priority: 'normal', target_type: 'company', target_value: '' });
    const [attachment, setAttachment] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const submit = async (event) => {
        event.preventDefault(); setSaving(true); setMessage('');
        const payload = new FormData(); Object.entries(form).forEach(([key,value]) => value && payload.append(key,value)); if (attachment) payload.append('attachment', attachment);
        try { await api.post('/admin/announcements', payload, { headers: {'Content-Type':'multipart/form-data'} }); setForm({ title:'', content:'', priority:'normal', target_type:'company', target_value:'' }); setAttachment(null); setMessage('Pengumuman berhasil dipublikasikan.'); }
        catch (error) { setMessage(error.response?.data?.message || 'Pengumuman gagal dipublikasikan.'); } finally { setSaving(false); }
    };
    return <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8"><div className="flex items-center gap-3"><span className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Megaphone/></span><div><h1 className="text-3xl font-bold text-slate-900">Buat Pengumuman</h1><p className="text-slate-500">Publikasikan informasi beserta surat atau gambar pendukung.</p></div></div><form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><input required placeholder="Judul pengumuman" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3"/><textarea required rows="7" placeholder="Isi pengumuman" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3"/><div className="grid gap-4 md:grid-cols-2"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="rounded-xl border border-slate-200 px-4 py-3"><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Penting</option><option value="low">Rendah</option></select><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600"><FileUp className="h-5 w-5"/>{attachment?.name || 'Pilih gambar/PDF (opsional)'}<input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e=>setAttachment(e.target.files?.[0]||null)} className="hidden"/></label></div>{message && <p className="text-sm text-emerald-700">{message}</p>}<button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white">{saving && <Loader2 className="h-4 w-4 animate-spin"/>}Publikasikan</button></form></div>;
}
