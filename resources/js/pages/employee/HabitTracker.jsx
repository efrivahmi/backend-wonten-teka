import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlarmClock, BellRing, CheckCircle2, Flame, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../api';

const nextReminder = (time, recurrence) => {
    const [hour, minute] = String(time || '07:00').split(':').map(Number);
    const candidate = new Date();
    candidate.setHours(hour, minute, 0, 0);
    if (candidate <= new Date()) candidate.setDate(candidate.getDate() + 1);
    if (recurrence === 'weekdays') {
        while ([0, 6].includes(candidate.getDay())) candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
};

export default function HabitTracker() {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', recurrence_rule: 'daily', reminder_time: '07:00', reminder_enabled: true });
    const timers = useRef(new Map());

    const scheduleBrowserReminder = useCallback((habit) => {
        const oldTimer = timers.current.get(habit.id);
        if (oldTimer) clearTimeout(oldTimer);
        if (!('Notification' in window) || !habit.reminder_enabled || !habit.reminder_time || window.Notification.permission !== 'granted') return;
        const scheduled = nextReminder(habit.reminder_time, habit.recurrence_rule);
        const timer = setTimeout(() => {
            new window.Notification(`Pengingat Habit: ${habit.title}`, {
                body: habit.description || 'Waktunya menjaga kebiasaan baik Anda.',
                icon: '/favicon.ico',
                tag: `habit-${habit.id}`,
            });
            scheduleBrowserReminder(habit);
        }, Math.min(scheduled.getTime() - Date.now(), 2147483647));
        timers.current.set(habit.id, timer);
    }, []);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const response = await api.get('/tasks', { params: { type: 'habit' } });
            const data = response.data?.data || [];
            setHabits(data);
            data.forEach(scheduleBrowserReminder);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Habit belum dapat dimuat.');
        } finally { setLoading(false); }
    }, [scheduleBrowserReminder]);

    useEffect(() => {
        load();
        const activeTimers = timers.current;
        return () => activeTimers.forEach(clearTimeout);
    }, [load]);

    const createHabit = async event => {
        event.preventDefault(); setError('');
        try {
            await api.post('/tasks', {
                ...form,
                is_habit: true,
                task_date: null,
                reminder_enabled: form.reminder_enabled && Boolean(form.reminder_time),
            });
            setForm({ title: '', description: '', recurrence_rule: 'daily', reminder_time: '07:00', reminder_enabled: true });
            setFormOpen(false); await load();
        } catch (requestError) {
            setError(requestError.response?.data?.message || Object.values(requestError.response?.data?.errors || {})?.[0]?.[0] || 'Habit gagal disimpan.');
        }
    };

    const toggleReminder = async habit => {
        const enabling = !habit.reminder_enabled;
        if (enabling) {
            if (!('Notification' in window)) {
                setError('Browser ini tidak mendukung alarm notifikasi.');
                return;
            }
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setError('Izin notifikasi diperlukan untuk mengaktifkan alarm habit.');
                return;
            }
        }
        try {
            const response = await api.put(`/tasks/${habit.id}`, {
                reminder_enabled: enabling,
                reminder_time: habit.reminder_time?.slice(0, 5) || '07:00',
            });
            const updated = response.data.data;
            setHabits(current => current.map(item => item.id === habit.id ? updated : item));
            scheduleBrowserReminder(updated);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Alarm gagal diperbarui.');
        }
    };

    const complete = async habit => {
        try {
            await api.post(`/tasks/${habit.id}/complete`);
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Habit hari ini sudah diselesaikan.');
        }
    };

    const remove = async habit => {
        try {
            await api.delete(`/tasks/${habit.id}`);
            const timer = timers.current.get(habit.id);
            if (timer) clearTimeout(timer);
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Habit gagal dihapus.');
        }
    };

    return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 md:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Rutinitas pribadi</p><h1 className="mt-2 text-3xl font-black text-slate-900">Habit Tracker</h1><p className="mt-2 text-slate-500">Bangun kebiasaan, jaga streak, dan aktifkan alarm pengingat.</p></div>
            <div className="flex gap-2"><button onClick={load} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600" aria-label="Muat ulang"><RefreshCw className="h-5 w-5" /></button><button onClick={() => setFormOpen(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white"><Plus className="h-5 w-5" />Tambah Habit</button></div>
        </header>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><strong>Alarm web:</strong> aktif saat izin notifikasi diberikan dan aplikasi web masih terbuka. Alarm mobile tetap memakai notifikasi lokal perangkat.</div>
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}

        {formOpen && <form onSubmit={createHabit} className="grid gap-4 rounded-2xl border border-emerald-200 bg-white p-5 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-700 md:col-span-2">Nama habit<input required value={form.title} onChange={event => setForm({...form, title: event.target.value})} className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" placeholder="Contoh: Olahraga pagi" /></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2">Catatan<textarea value={form.description} onChange={event => setForm({...form, description: event.target.value})} className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" placeholder="Tujuan atau panduan singkat" /></label>
            <label className="text-sm font-bold text-slate-700">Pengulangan<select value={form.recurrence_rule} onChange={event => setForm({...form, recurrence_rule: event.target.value})} className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"><option value="daily">Setiap hari</option><option value="weekdays">Hari kerja</option><option value="weekly">Setiap minggu</option></select></label>
            <label className="text-sm font-bold text-slate-700">Waktu alarm<input type="time" value={form.reminder_time} onChange={event => setForm({...form, reminder_time: event.target.value})} className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700 md:col-span-2"><input type="checkbox" checked={form.reminder_enabled} onChange={event => setForm({...form, reminder_enabled: event.target.checked})} className="h-5 w-5 accent-emerald-700" />Aktifkan alarm setelah habit disimpan</label>
            <button className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white md:col-span-2">Simpan Habit</button>
        </form>}

        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : habits.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-14 text-center text-slate-500">Belum ada habit. Mulai dari satu kebiasaan kecil.</div> : <div className="grid gap-4 md:grid-cols-2">
            {habits.map(habit => <article key={habit.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-900">{habit.title}</h2><p className="mt-1 text-sm text-slate-500">{habit.description || 'Tidak ada catatan.'}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"><Flame className="h-4 w-4" />{habit.streak_count || 0} hari</span></div>
                <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-400">Pengulangan</span><strong className="mt-1 block capitalize text-slate-800">{String(habit.recurrence_rule || 'daily').replace('_', ' ')}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-400">Waktu</span><strong className="mt-1 block text-slate-800">{habit.reminder_time?.slice(0, 5) || '--:--'}</strong></div></div>
                <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => complete(habit)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesai hari ini</button><button onClick={() => toggleReminder(habit)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${habit.reminder_enabled ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}><BellRing className="h-4 w-4" />{habit.reminder_enabled ? 'Alarm aktif' : 'Aktifkan alarm'}</button><button onClick={() => remove(habit)} className="rounded-xl border border-rose-200 p-2.5 text-rose-600" aria-label={`Hapus ${habit.title}`}><Trash2 className="h-5 w-5" /></button></div>
            </article>)}
        </div>}
    </div>;
}
