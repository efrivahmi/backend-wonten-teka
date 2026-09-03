import React, { useState, useEffect } from 'react';
import { 
    FileBarChart, 
    Filter, 
    Download, 
    Loader2, 
    FileSpreadsheet,
    Calendar
} from 'lucide-react';
import api from '../../api';

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/attendance');
            setLogs(response.data.data || []);
        } catch (error) {
            console.error("Error fetching logs:", error);
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
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Laporan & Rekapitulasi</h1>
                    <p className="text-slate-500 mt-1">Unduh dan pantau riwayat absensi secara keseluruhan.</p>
                </div>
                <div className="flex space-x-2">
                    <button className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors shadow-sm">
                        <Filter className="h-4 w-4" />
                        <span>Filter</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                        <Download className="h-4 w-4" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Riwayat Absensi (Bulan Ini)</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Karyawan</th>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{log.employee?.user?.name || `Emp #${log.employee_id}`}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-800 font-medium">
                                                {log.check_in_at ? new Date(log.check_in_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-800 font-medium">
                                                {log.check_in_at ? new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                                            {log.check_out_at ? new Date(log.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                                log.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' : 
                                                log.status === 'late' ? 'bg-rose-100 text-rose-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.status === 'on_time' ? 'Tepat Waktu' : log.status === 'late' ? 'Terlambat' : log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Tidak ada log absensi</p>
                                            <p className="text-sm mt-1">Belum ada karyawan yang melakukan absensi.</p>
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

export default Reports;
