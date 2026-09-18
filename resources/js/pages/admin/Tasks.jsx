import React, { useEffect, useState } from 'react';
import { CheckSquare, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Pagination from '../../components/Pagination';
import api from '../../api';

const emptyForm = { employee_id: '', title: '', description: '', task_date: new Date().toISOString().slice(0, 10), is_habit: false, recurrence_rule: 'daily', reminder_time: '', reminder_enabled: false, is_active: true };

export default function AdminTasks() {
    const [items, setItems] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true); setError('');
        try {
            const [taskResponse, employeeResponse] = await Promise.all([api.get(`/admin/tasks?page=${currentPage}`), api.get('/admin/employees?page=1&search=')]);
            setPagination(taskResponse.data);
            setItems(taskResponse.data?.data || []);
            setEmployees(employeeResponse.data?.data || employeeResponse.data || []);
        } catch (e) { setError(e.response?.data?.message || 'Data tugas belum dapat dimuat.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [currentPage]);

    const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
    const startEdit = item => { setEditing(item); setForm({ employee_id: item.employee_id, title: item.title, description: item.description || '', task_date: item.task_date?.slice(0,10) || new Date().toISOString().slice(0,10), is_habit: Boolean(item.is_habit), recurrence_rule: item.recurrence_rule || 'daily', reminder_time: item.reminder_time?.slice(0,5) || '', reminder_enabled: Boolean(item.reminder_enabled), is_active: Boolean(item.is_active) }); setOpen(true); };
    const save = async event => {
        event.preventDefault(); setError('');
        const payload = {...form, task_date: form.is_habit ? null : form.task_date, reminder_time: form.reminder_time || null, reminder_enabled: Boolean(form.reminder_time && form.reminder_enabled)};
        try {
            if (editing) await api.put(`/admin/tasks/${editing.id}`, payload);
            else await api.post('/admin/tasks', payload);
            setOpen(false); setEditing(null); setForm(emptyForm); await load();
        } catch (e) { setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {})?.[0]?.[0] || 'Tugas gagal disimpan.'); }
    };
    const remove = async item => {
        if (!window.confirm(`Hapus “${item.title}”?`)) return;
        try { await api.delete(`/admin/tasks/${item.id}`); await load(); }
        catch (e) { setError(e.response?.data?.message || 'Tugas gagal dihapus.'); }
    };

    return <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><CheckSquare/></span><div><h1 className="text-3xl font-bold text-slate-900">Daily Task & Habit Karyawan</h1><p className="text-slate-500">Tambah, ubah, aktifkan, atau hapus tugas yang tampil di website dan mobile karyawan.</p></div></div><div className="flex gap-2"><button onClick={load} className="rounded-xl border bg-white p-3"><RefreshCw className="h-5 w-5"/></button><button onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white"><Plus className="h-5 w-5"/>Tambah</button></div></div>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
        {open && <form onSubmit={save} className="grid gap-4 rounded-2xl border border-emerald-200 bg-white p-5 md:grid-cols-2"><select required value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} className="rounded-xl border px-4 py-3"><option value="">Pilih karyawan</option>{employees.map(employee=><option key={employee.id} value={employee.id}>{employee.full_name} — {employee.employee_number}</option>)}</select><select value={form.is_habit?'habit':'daily'} onChange={e=>setForm({...form,is_habit:e.target.value==='habit'})} className="rounded-xl border px-4 py-3"><option value="daily">Daily Task</option><option value="habit">Habit</option></select><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Judul tugas" className="rounded-xl border px-4 py-3 md:col-span-2"/><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Keterangan" className="rounded-xl border px-4 py-3 md:col-span-2"/>{!form.is_habit&&<input type="date" required value={form.task_date} onChange={e=>setForm({...form,task_date:e.target.value})} className="rounded-xl border px-4 py-3"/>}{form.is_habit&&<select value={form.recurrence_rule} onChange={e=>setForm({...form,recurrence_rule:e.target.value})} className="rounded-xl border px-4 py-3"><option value="daily">Setiap hari</option><option value="weekdays">Hari kerja</option><option value="weekly">Mingguan</option></select>}<input type="time" value={form.reminder_time} onChange={e=>setForm({...form,reminder_time:e.target.value})} className="rounded-xl border px-4 py-3"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.reminder_enabled} onChange={e=>setForm({...form,reminder_enabled:e.target.checked})}/>Aktifkan pengingat</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/>Tugas aktif</label><button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white md:col-span-2">{editing?'Simpan perubahan':'Buat tugas'}</button></form>}
        {loading?<div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-700"/></div>:<><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-4 text-left">Karyawan</th><th className="p-4 text-left">Tugas</th><th className="p-4 text-left">Jenis/Jadwal</th><th className="p-4 text-left">Status</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody>{items.map(item=><tr key={item.id} className="border-t"><td className="p-4"><strong>{item.employee?.full_name}</strong><span className="block text-xs text-slate-500">{item.employee?.employee_number}</span></td><td className="p-4"><strong>{item.title}</strong><span className="block max-w-sm text-xs text-slate-500">{item.description||'—'}</span></td><td className="p-4">{item.is_habit?`Habit • ${item.recurrence_rule}`:`Daily • ${item.task_date?.slice(0,10)}`}</td><td className="p-4">{item.is_active?'Aktif':'Selesai/nonaktif'}</td><td className="p-4 text-right"><button onClick={()=>startEdit(item)} className="mr-2 rounded-lg bg-blue-50 p-2 text-blue-700"><Pencil className="h-4 w-4"/></button><button onClick={()=>remove(item)} className="rounded-lg bg-rose-50 p-2 text-rose-700"><Trash2 className="h-4 w-4"/></button></td></tr>)}</tbody></table>{!items.length&&<div className="p-12 text-center text-slate-500">Belum ada tugas.</div>}</div><Pagination pagination={pagination} onPageChange={setCurrentPage} /></>}
    </div>;
}
