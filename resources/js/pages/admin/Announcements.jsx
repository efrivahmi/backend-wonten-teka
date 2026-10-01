import React, { useCallback, useEffect, useState } from 'react';
import { FileUp, Loader2, Megaphone, Pencil, Power, Trash2 } from 'lucide-react';
import api from '../../api';

const emptyForm = () => ({
    title: '', content: '', priority: 'normal', target_type: 'company', target_value: '',
    published_at: '', expires_at: '', is_active: true,
});

const toLocalInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toUtcIso = (value) => value ? new Date(value).toISOString() : '';
const statusLabels = { active: 'Aktif', inactive: 'Nonaktif', scheduled: 'Terjadwal', expired: 'Kedaluwarsa' };

export default function AdminAnnouncements() {
    const [form, setForm] = useState(emptyForm);
    const [attachment, setAttachment] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [items, setItems] = useState([]);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/announcements');
            setItems(response.data?.data || []);
        } catch {
            setMessage('Daftar pengumuman gagal dimuat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        const payload = new FormData();
        payload.append('title', form.title);
        payload.append('content', form.content);
        payload.append('priority', form.priority);
        payload.append('target_type', form.target_type);
        payload.append('target_value', form.target_value);
        payload.append('published_at', toUtcIso(form.published_at));
        payload.append('expires_at', toUtcIso(form.expires_at));
        payload.append('is_active', form.is_active ? '1' : '0');
        if (attachment) payload.append('attachment', attachment);

        try {
            if (editing) {
                payload.append('_method', 'PUT');
                await api.post(`/admin/announcements/${editing.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/admin/announcements', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            setForm(emptyForm());
            setAttachment(null);
            setEditing(null);
            setMessage('Pengumuman berhasil disimpan.');
            await load();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Pengumuman gagal disimpan.');
        } finally {
            setSaving(false);
        }
    };

    const edit = (item) => {
        setEditing(item);
        setForm({
            title: item.title || '', content: item.body || '', priority: item.priority || 'normal',
            target_type: item.target_type || 'company', target_value: item.target_value || '',
            published_at: toLocalInput(item.published_at), expires_at: toLocalInput(item.expires_at),
            is_active: item.is_active !== false,
        });
        setAttachment(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleActive = async (item) => {
        try {
            await api.patch(`/admin/announcements/${item.id}/active`, { is_active: !item.is_active });
            await load();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Status pengumuman gagal diperbarui.');
        }
    };

    const remove = async (item) => {
        if (!window.confirm(`Hapus “${item.title}”?`)) return;
        try {
            await api.delete(`/admin/announcements/${item.id}`);
            await load();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Pengumuman gagal dihapus.');
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
            <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Megaphone /></span>
                <div><h1 className="text-3xl font-bold text-slate-900">Kelola Pengumuman</h1><p className="text-slate-500">Atur masa tayang dan status pengumuman untuk karyawan.</p></div>
            </div>

            <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <input required placeholder="Judul pengumuman" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
                <textarea required rows="6" placeholder="Isi pengumuman" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
                <div className="grid gap-4 sm:grid-cols-2">
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-3"><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Penting</option><option value="low">Rendah</option></select>
                    <select value={form.target_type} onChange={e => setForm({ ...form, target_type: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-3"><option value="company">Seluruh perusahaan</option><option value="department">Departemen</option><option value="employee">Karyawan tertentu</option></select>
                    {form.target_type !== 'company' && <input required placeholder={form.target_type === 'department' ? 'Nama departemen' : 'ID karyawan'} value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-3" />}
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600"><FileUp className="h-5 w-5 shrink-0" />{attachment?.name || 'Pilih gambar/PDF (opsional)'}<input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setAttachment(e.target.files?.[0] || null)} className="hidden" /></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">Mulai ditampilkan (kosong = sekarang)<input type="datetime-local" value={form.published_at} onChange={e => setForm({ ...form, published_at: e.target.value })} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>
                    <label className="text-sm font-semibold text-slate-700">Akhir masa tayang (kosong = tanpa batas)<input type="datetime-local" min={form.published_at || undefined} value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>
                </div>
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-5 w-5 rounded border-slate-300 text-emerald-700" />Aktifkan pengumuman</label>
                {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
                <div className="flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Simpan perubahan' : 'Publikasikan'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm()); setAttachment(null); }} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Batal edit</button>}</div>
            </form>

            <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Semua pengumuman</h2>
                {loading ? <div className="grid min-h-32 place-items-center"><Loader2 className="animate-spin text-emerald-700" /></div> : items.map(item => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row">
                            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{item.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : item.status === 'expired' ? 'bg-slate-200 text-slate-700' : item.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>{statusLabels[item.status] || 'Status tidak diketahui'}</span></div><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{item.body}</p><p className="mt-3 text-xs text-slate-500">{item.priority} · {item.target_type}{item.expires_at ? ` · Berakhir ${new Date(item.expires_at).toLocaleString('id-ID')}` : ' · Tanpa batas waktu'}</p></div>
                            <div className="flex shrink-0 items-start gap-2"><button onClick={() => toggleActive(item)} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${item.is_active ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}><Power className="h-4 w-4" />{item.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button><button onClick={() => edit(item)} className="rounded-lg bg-blue-50 p-2 text-blue-700" aria-label="Edit pengumuman"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(item)} className="rounded-lg bg-rose-50 p-2 text-rose-700" aria-label="Hapus pengumuman"><Trash2 className="h-4 w-4" /></button></div>
                        </div>
                    </article>
                ))}
                {!loading && !items.length && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Belum ada pengumuman.</div>}
            </section>
        </div>
    );
}
