import React, { useState, useEffect } from 'react';
import { 
    FileBarChart, 
    Filter, 
    Download, 
    Loader2, 
    FileSpreadsheet,
    Calendar,
    MoreVertical,
    Edit2,
    Trash2,
    X,
    AlertTriangle
} from 'lucide-react';
import api from '../../api';

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState(null);
    const [formData, setFormData] = useState({
        check_in_at: '',
        check_out_at: '',
        status: ''
    });
    const [saving, setSaving] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

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

    // --- CRUD Handlers ---
    const openEditModal = (log) => {
        setEditingLog(log);
        // Format dates for datetime-local input
        const formatForInput = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            // Adjust for local timezone offset to display correctly in input
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            return d.toISOString().slice(0, 16);
        };
        
        setFormData({
            check_in_at: formatForInput(log.check_in_at),
            check_out_at: formatForInput(log.check_out_at),
            status: log.status || 'on_time'
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const saveLog = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            // Format dates back for API if needed, or send as is
            const payload = { ...formData };
            if (!payload.check_in_at) payload.check_in_at = null;
            if (!payload.check_out_at) payload.check_out_at = null;
            
            await api.put(`/admin/attendance/${editingLog.id}`, payload);
            setIsModalOpen(false);
            fetchLogs();
        } catch (error) {
            console.error("Failed to update log", error);
            alert("Gagal memperbarui log absensi.");
        } finally {
            setSaving(false);
        }
    };

    const deleteLog = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus log absensi ini secara permanen?")) return;
        try {
            await api.delete(`/admin/attendance/${id}`);
            fetchLogs();
            setActiveDropdown(null);
        } catch (error) {
            console.error("Failed to delete log", error);
            alert("Gagal menghapus log absensi.");
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

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Karyawan</th>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 relative">
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
                                            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${
                                                log.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' : 
                                                log.status === 'late' ? 'bg-rose-100 text-rose-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.status === 'on_time' ? 'Tepat Waktu' : log.status === 'late' ? 'Terlambat' : log.status}
                                            </span>
                                            {(log.is_flagged || log.status === 'flagged') && (
                                                <span className="ml-2 inline-flex items-center text-rose-600 bg-rose-50 p-1 rounded-md" title="Indikasi Kecurangan (Flagged)">
                                                    <AlertTriangle className="h-4 w-4" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block text-left">
                                                <button 
                                                    onClick={() => setActiveDropdown(activeDropdown === log.id ? null : log.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>
                                                {activeDropdown === log.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                                                        <button 
                                                            onClick={() => openEditModal(log)}
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                                                        >
                                                            <Edit2 className="h-4 w-4 mr-2 text-blue-500" /> Edit Manual
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteLog(log.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center text-rose-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Hapus Log
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
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

            {/* MODAL EDIT LOG ABSENSI */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">
                                Edit Log Absensi Manual
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <form id="editLogForm" onSubmit={saveLog} className="space-y-4">
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm mb-4">
                                    <span className="font-bold">Peringatan:</span> Mengubah jam absensi secara manual akan merevisi log karyawan. Pastikan Anda memiliki alasan yang tepat.
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Check In</label>
                                    <input 
                                        type="datetime-local" 
                                        name="check_in_at"
                                        value={formData.check_in_at}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Check Out</label>
                                    <input 
                                        type="datetime-local" 
                                        name="check_out_at"
                                        value={formData.check_out_at}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Kehadiran</label>
                                    <select 
                                        name="status"
                                        value={formData.status}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    >
                                        <option value="on_time">Tepat Waktu (On Time)</option>
                                        <option value="late">Terlambat (Late)</option>
                                        <option value="absent">Alpha / Tidak Masuk</option>
                                        <option value="leave">Cuti / Sakit</option>
                                    </select>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50">
                            <button 
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit"
                                form="editLogForm"
                                disabled={saving}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center shadow-sm"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
