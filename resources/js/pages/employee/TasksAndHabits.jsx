import React, { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Circle, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import api from '../../api';

export default function TasksAndHabits() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState('today'); // 'today' | 'tracking'
    const [trackingData, setTrackingData] = useState(null);
    const [loadingTracking, setLoadingTracking] = useState(false);

    const loadTasks = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/tasks');
            const data = response.data.data?.tasks || response.data.tasks || response.data.data || [];
            setTasks(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e.response?.data?.message || 'Gagal memuat daftar tugas.');
        } finally {
            setLoading(false);
        }
    };

    const loadTracking = async () => {
        setLoadingTracking(true);
        setError('');
        try {
            const response = await api.get('/tasks/tracking');
            setTrackingData(response.data);
        } catch (e) {
            setError('Gagal memuat riwayat bulan ini.');
        } finally {
            setLoadingTracking(false);
        }
    };

    useEffect(() => { 
        if (activeTab === 'today') loadTasks(); 
        else loadTracking();
    }, [activeTab]);

    const addTask = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Nama tugas wajib diisi.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const now = new Date();
            const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            await api.post('/tasks', {
                title: title.trim(),
                description: description.trim(),
                task_date: localDate,
                is_habit: false,
            });
            
            setTitle('');
            setDescription('');
            await loadTasks();
        } catch (e) {
            const validation = Object.values(e.response?.data?.errors || {})?.[0]?.[0];
            setError(validation || e.response?.data?.message || 'Gagal menambahkan tugas.');
        } finally {
            setSaving(false);
        }
    };

    const toggleComplete = async (task) => {
        const isCompleting = task.is_active;
        const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, is_active: !isCompleting } : t);
        setTasks(updatedTasks);
        
        try {
            await api.put(`/tasks/${task.id}`, { is_active: !isCompleting });
            if (!isCompleting) await loadTasks();
        } catch (e) {
            setError(e.response?.data?.message || 'Gagal mengubah status tugas.');
            await loadTasks();
        }
    };

    const deleteTask = async (task) => {
        if (!confirm(`Hapus tugas "${task.title}"?`)) return;
        
        try {
            await api.delete(`/tasks/${task.id}`);
            await loadTasks();
        } catch (e) {
            setError(e.response?.data?.message || 'Gagal menghapus tugas.');
        }
    };

    const pendingTasks = tasks.filter(t => t.is_active);
    const completedTasks = tasks.filter(t => !t.is_active);

    return (
        <div className="mx-auto max-w-4xl p-6 md:p-8 space-y-8">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
                    <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Tugas Harian</h1>
                    <p className="text-slate-500">Kelola dan pantau pekerjaan Anda hari ini.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button onClick={() => setActiveTab('today')} className={`pb-3 font-semibold px-2 border-b-2 transition-colors ${activeTab === 'today' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Tugas Hari Ini</button>
                <button onClick={() => setActiveTab('tracking')} className={`pb-3 font-semibold px-2 border-b-2 transition-colors ${activeTab === 'tracking' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Laporan Bulan Ini</button>
            </div>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                    {error}
                </div>
            )}

            {activeTab === 'tracking' ? (
                loadingTracking ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : (
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Tugas yang Diselesaikan Bulan Ini</h3>
                            {trackingData?.completed_tasks?.length === 0 ? (
                                <p className="text-sm text-slate-500 py-4">Belum ada tugas biasa yang diselesaikan.</p>
                            ) : (
                                <div className="divide-y">
                                    {trackingData?.completed_tasks?.map(task => (
                                        <div key={task.id} className="py-3 flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{task.title}</h4>
                                                <p className="text-sm text-slate-500">{new Date(task.last_completed_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                                            </div>
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">Selesai</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Riwayat Habit Bulan Ini</h3>
                            {trackingData?.completed_habits?.length === 0 ? (
                                <p className="text-sm text-slate-500 py-4">Belum ada riwayat habit bulan ini.</p>
                            ) : (
                                <div className="divide-y">
                                    {trackingData?.completed_habits?.map(record => (
                                        <div key={record.id} className="py-3 flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{record.personal_task?.title}</h4>
                                                <p className="text-sm text-slate-500">{new Date(record.completed_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                                            </div>
                                            <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200">Streak: {record.personal_task?.streak_count || 1}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            ) : (
                <div className="space-y-8">
            {/* Task Form */}
            <form onSubmit={addTask} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-800">Tambah Tugas Baru</h2>
                <div className="space-y-3">
                    <input 
                        required 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="Nama tugas (mis. Buat laporan bulanan)" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-shadow"
                    />
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Deskripsi tugas (opsional)" 
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-shadow resize-none"
                    />
                </div>
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        disabled={saving} 
                        className="inline-flex items-center px-6 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors"
                    >
                        {saving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Menyimpan...</>
                        ) : (
                            <><Plus className="mr-2 h-5 w-5"/> Tambah Tugas</>
                        )}
                    </button>
                </div>
            </form>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Pending Tasks */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                            <Circle className="h-5 w-5 text-slate-400" />
                            Belum Selesai ({pendingTasks.length})
                        </h3>
                        {pendingTasks.length === 0 ? (
                            <div className="text-center py-8 rounded-2xl border border-dashed border-slate-300 text-slate-500 bg-slate-50/50">
                                Tidak ada tugas yang menunggu.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {pendingTasks.map(task => (
                                    <article key={task.id} className="group flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
                                        <button 
                                            onClick={() => toggleComplete(task)}
                                            className="mt-1 text-slate-300 hover:text-emerald-600 transition-colors focus:outline-none"
                                        >
                                            <Circle className="h-6 w-6" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-slate-900 text-lg truncate">{task.title}</h4>
                                            {task.description && (
                                                <p className="mt-1 text-slate-600 text-sm whitespace-pre-wrap">{task.description}</p>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => deleteTask(task)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all focus:outline-none focus:opacity-100"
                                            title="Hapus tugas"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-emerald-700 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Selesai Hari Ini ({completedTasks.length})
                            </h3>
                            <div className="grid gap-3 opacity-75">
                                {completedTasks.map(task => (
                                    <article key={task.id} className="group flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                        <button 
                                            disabled // API doesn't support uncompleting yet, but UI visually indicates it's done
                                            className="mt-1 text-emerald-600 cursor-default"
                                        >
                                            <CheckCircle2 className="h-6 w-6" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-slate-500 text-lg line-through truncate">{task.title}</h4>
                                            {task.description && (
                                                <p className="mt-1 text-slate-400 text-sm whitespace-pre-wrap line-through">{task.description}</p>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => deleteTask(task)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all focus:outline-none focus:opacity-100"
                                            title="Hapus tugas"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        )}
        </div>
    );
}
