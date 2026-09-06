import React, { useState, useEffect } from 'react';
import { 
    CalendarRange, 
    Plus, 
    Clock, 
    MoreVertical, 
    Loader2,
    Save
} from 'lucide-react';
import api from '../../api';

const Schedule = () => {
    const [loading, setLoading] = useState(true);
    const [shifts, setShifts] = useState([]);
    
    // Working Days
    const [workingDays, setWorkingDays] = useState([]);
    const [savingWorkingDays, setSavingWorkingDays] = useState(false);

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
                    <button className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm">
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
                        <div key={shift.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-emerald-300 transition-colors">
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
                                <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
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
            
        </div>
    );
};

export default Schedule;
