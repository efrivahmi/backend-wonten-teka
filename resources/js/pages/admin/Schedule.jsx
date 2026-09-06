import React, { useState, useEffect } from 'react';
import { 
    CalendarRange, 
    Plus, 
    Clock, 
    MoreVertical, 
    Loader2,
    Save,
    X,
    Trash2,
    Edit2
} from 'lucide-react';
import api from '../../api';

const Schedule = () => {
    const [loading, setLoading] = useState(true);
    const [shifts, setShifts] = useState([]);
    
    // Working Days
    const [workingDays, setWorkingDays] = useState([]);
    const [savingWorkingDays, setSavingWorkingDays] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        start_time: '08:00',
        end_time: '17:00',
        grace_period_minutes: 15,
        is_default: false
    });
    const [savingShift, setSavingShift] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    const DAYS = [
        { id: 1, name: 'Senin' },
        { id: 2, name: 'Selasa' },
        { id: 3, name: 'Rabu' },
        { id: 4, name: 'Kamis' },
        { id: 5, name: 'Jumat' },
        { id: 6, name: 'Sabtu' },
        { id: 7, name: 'Minggu' },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [shiftsRes, workingDaysRes] = await Promise.all([
                api.get('/admin/shifts'),
                api.get('/company/working-days')
            ]);
            setShifts(shiftsRes.data.data || []);
            setWorkingDays(workingDaysRes.data.working_days || [1,2,3,4,5]);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleWorkingDay = (dayId) => {
        if (workingDays.includes(dayId)) {
            setWorkingDays(workingDays.filter(d => d !== dayId));
        } else {
            setWorkingDays([...workingDays, dayId].sort());
        }
    };

    const saveWorkingDays = async () => {
        try {
            setSavingWorkingDays(true);
            await api.put('/company/working-days', { working_days: workingDays });
            alert("Pengaturan Hari Kerja Berhasil Disimpan!");
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan hari kerja");
        } finally {
            setSavingWorkingDays(false);
        }
    };

    // --- SHIFT CRUD LOGIC ---
    const openAddModal = () => {
        setEditingShift(null);
        setFormData({
            name: '',
            start_time: '08:00',
            end_time: '17:00',
            grace_period_minutes: 15,
            is_default: false
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const openEditModal = (shift) => {
        setEditingShift(shift);
        setFormData({
            name: shift.name,
            start_time: shift.start_time.substring(0, 5),
            end_time: shift.end_time.substring(0, 5),
            grace_period_minutes: shift.grace_period_minutes,
            is_default: shift.is_default === 1 || shift.is_default === true
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const saveShift = async (e) => {
        e.preventDefault();
        try {
            setSavingShift(true);
            if (editingShift) {
                await api.put(`/admin/shifts/${editingShift.id}`, formData);
            } else {
                await api.post('/admin/shifts', formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to save shift", error);
            alert(error.response?.data?.message || "Gagal menyimpan template shift.");
        } finally {
            setSavingShift(false);
        }
    };

    const deleteShift = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus template shift ini?")) return;
        try {
            await api.delete(`/admin/shifts/${id}`);
            fetchData();
            setActiveDropdown(null);
        } catch (error) {
            console.error("Failed to delete shift", error);
            alert("Gagal menghapus shift.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Manajemen Jadwal & Shift</h1>
                    <p className="text-slate-500 mt-1">Kelola jam kerja dan rotasi shift karyawan.</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={openAddModal}
                        className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Shift</span>
                    </button>
                </div>
            </div>

            {/* WORKING DAYS CONFIGURATION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Hari Kerja Aktif</h2>
                        <p className="text-sm text-slate-500">Tentukan hari apa saja karyawan diwajibkan untuk masuk. Jika absen pada hari ini, maka akan terhitung Alpha.</p>
                    </div>
                    <button 
                        onClick={saveWorkingDays}
                        disabled={savingWorkingDays}
                        className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                    >
                        {savingWorkingDays ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span>Simpan Hari</span>
                    </button>
                </div>
                <div className="p-6 flex flex-wrap gap-4">
                    {DAYS.map(day => {
                        const isActive = workingDays.includes(day.id);
                        return (
                            <button
                                key={day.id}
                                onClick={() => toggleWorkingDay(day.id)}
                                className={`px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all flex items-center ${
                                    isActive 
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className={`w-4 h-4 mr-2 rounded-md flex items-center justify-center border ${
                                    isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                                }`}>
                                    {isActive && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                {day.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SHIFT TEMPLATES */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Template Shift (Jam Kerja)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shifts.map((shift) => (
                        <div key={shift.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-emerald-300 transition-colors relative">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{shift.name}</h3>
                                    {shift.is_default ? (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                            Default Shift
                                        </span>
                                    ) : (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                            Alternatif
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setActiveDropdown(activeDropdown === shift.id ? null : shift.id)}
                                        className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                    {activeDropdown === shift.id && (
                                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10">
                                            <button 
                                                onClick={() => openEditModal(shift)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                                            >
                                                <Edit2 className="h-4 w-4 mr-2 text-blue-500" /> Edit
                                            </button>
                                            <button 
                                                onClick={() => deleteShift(shift.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center text-rose-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Hapus
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-5 bg-slate-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Jam Masuk</span>
                                        <div className="flex items-center text-slate-800 font-bold">
                                            <Clock className="h-4 w-4 mr-2 text-emerald-500" />
                                            {shift.start_time.substring(0, 5)}
                                        </div>
                                    </div>
                                    <div className="text-slate-300 px-4">
                                        <svg className="w-16 h-2" viewBox="0 0 100 10" preserveAspectRatio="none">
                                            <line x1="0" y1="5" x2="100" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                                            <polygon points="100,5 90,0 90,10" fill="currentColor" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Jam Keluar</span>
                                        <div className="flex items-center text-slate-800 font-bold">
                                            <Clock className="h-4 w-4 mr-2 text-rose-500" />
                                            {shift.end_time.substring(0, 5)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Toleransi Keterlambatan</span>
                                    <span className="text-sm font-bold text-slate-800">{shift.grace_period_minutes} Menit</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {shifts.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 mt-6">
                        <CalendarRange className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-lg font-medium text-slate-800">Belum ada template shift</p>
                        <p className="text-sm mt-1">Buat shift pertama Anda untuk mulai mengatur jam kerja karyawan.</p>
                    </div>
                )}
            </div>
            
            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {editingShift ? 'Edit Template Shift' : 'Tambah Template Shift'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={saveShift} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Shift</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    placeholder="Contoh: Shift Pagi"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jam Masuk</label>
                                    <input 
                                        type="time" 
                                        name="start_time"
                                        value={formData.start_time}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jam Keluar</label>
                                    <input 
                                        type="time" 
                                        name="end_time"
                                        value={formData.end_time}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Toleransi Telat (Menit)</label>
                                <input 
                                    type="number" 
                                    name="grace_period_minutes"
                                    value={formData.grace_period_minutes}
                                    onChange={handleFormChange}
                                    min="0"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                                <p className="text-xs text-slate-500 mt-1">Batas waktu sebelum absensi masuk dianggap terlambat.</p>
                            </div>
                            
                            <div className="flex items-center mt-2">
                                <input 
                                    type="checkbox" 
                                    id="is_default"
                                    name="is_default"
                                    checked={formData.is_default}
                                    onChange={handleFormChange}
                                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"
                                />
                                <label htmlFor="is_default" className="ml-2 text-sm font-medium text-slate-700">
                                    Jadikan sebagai Shift Default
                                </label>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={savingShift}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center"
                                >
                                    {savingShift && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Simpan Shift
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default Schedule;

