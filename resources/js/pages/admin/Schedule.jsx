import React, { useState, useEffect } from 'react';
import { 
    CalendarRange, 
    Plus, 
    Clock, 
    MoreVertical, 
    Loader2 
} from 'lucide-react';
import api from '../../api';

const Schedule = () => {
    const [loading, setLoading] = useState(true);
    const [shifts, setShifts] = useState([]);

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/shifts');
            setShifts(response.data.data || []);
        } catch (error) {
            console.error("Error fetching shifts:", error);
        } finally {
            setLoading(false);
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
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                    <CalendarRange className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-slate-800">Belum ada template shift</p>
                    <p className="text-sm mt-1">Buat shift pertama Anda untuk mulai mengatur jadwal karyawan.</p>
                </div>
            )}
        </div>
    );
};

export default Schedule;
