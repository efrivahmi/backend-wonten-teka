import React, { useState, useEffect } from 'react';
import { 
    CalendarCheck, 
    Filter, 
    Clock, 
    Loader2, 
    MapPin,
    LogIn,
    LogOut
} from 'lucide-react';
import api from '../../api';

const Attendance = () => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/attendance/history');
            setHistory(response.data.data || []);
        } catch (error) {
            console.error("Error fetching attendance history:", error);
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
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Riwayat Absensi</h1>
                    <p className="text-slate-500 mt-1">Pantau kehadiran harian dan riwayat lokasi absen Anda.</p>
                </div>
                <div className="flex space-x-2">
                    <button className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors shadow-sm">
                        <Filter className="h-4 w-4" />
                        <span>Filter Bulan</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CalendarCheck className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Catatan Absensi (30 Hari Terakhir)</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                                <th className="px-6 py-4">Lokasi & Metode</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length > 0 ? (
                                history.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-slate-800 font-medium">
                                                <CalendarCheck className="h-4 w-4 mr-2 text-slate-400" />
                                                <span>{log.check_in_at ? new Date(log.check_in_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center px-3 py-1.5 w-fit rounded-lg font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200`}>
                                                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                                                {log.check_in_at ? new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center px-3 py-1.5 w-fit rounded-lg font-bold text-xs ${log.check_out_at ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                                {log.check_out_at ? new Date(log.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Belum'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start text-sm text-slate-600">
                                                <MapPin className="h-4 w-4 mr-1.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="capitalize font-medium block">{log.check_in_photo_url ? 'Face Recognition' : 'App'}</span>
                                                    {log.notes && <span className="text-xs text-slate-500">{log.notes}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                                log.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' : 
                                                log.status === 'late' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.status === 'on_time' ? 'Tepat Waktu' : log.status === 'late' ? 'Terlambat' : log.status}
                                            </span>
                                            {log.is_flagged && (
                                                <span className="ml-2 inline-flex px-2 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700">
                                                    Flagged
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <CalendarCheck className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Tidak ada riwayat absensi</p>
                                            <p className="text-sm mt-1">Anda belum pernah melakukan absensi bulan ini.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
