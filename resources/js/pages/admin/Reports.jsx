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
    , Search, Eye
} from 'lucide-react';
import api from '../../api';
import AttendanceDetailModal from './AttendanceDetailModal';
import Pagination from '../../components/Pagination';

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
    const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
    const [periodMode, setPeriodMode] = useState('month');
    const [month, setMonth] = useState(currentMonth);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [search, setSearch] = useState('');
    const [employees, setEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [draftReady, setDraftReady] = useState(false);
    const [detailId, setDetailId] = useState(null);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        Promise.all([fetchLogs(), api.get('/admin/employees').then(response => setEmployees(response.data.data || []))]);
    }, [currentPage]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { page: currentPage };
            if (search.trim()) params.search = search.trim();
            if (selectedEmployees.length) params.employee_ids = selectedEmployees.join(',');
            if (periodMode === 'month' && month) {
                const [year, monthNumber] = month.split('-');
                params.year = year; params.month = monthNumber;
            }
            if (periodMode === 'range') {
                if (dateFrom) params.date_from = dateFrom;
                if (dateTo) params.date_to = dateTo;
            }
            const response = await api.get('/admin/attendance', { params });
            setPagination(response.data);
            setLogs(response.data.data || []);
            setDraftReady(true);
        } catch (error) {
            console.error("Error fetching logs:", error);
            setError(error?.response?.data?.message || 'Rekap absensi belum dapat dimuat. Periksa koneksi lalu coba lagi.');
            setDraftReady(false);
        } finally {
            setLoading(false);
        }
    };

    const toggleEmployee = (id) => setSelectedEmployees(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    const selectedAll = employees.length > 0 && selectedEmployees.length === employees.length;
    const toggleAll = () => setSelectedEmployees(selectedAll ? [] : employees.map(item => item.id));
    const statusLabel = status => ({ on_time: 'Tepat Waktu', present: 'Hadir', late: 'Terlambat', absent: 'Alpha / Tidak Masuk', leave: 'Cuti / Sakit' }[status] || status || '-');
    const exportCsv = () => {
        if (!draftReady) return;
        const rows = [['Karyawan','Nomor Karyawan','Tanggal','Check In','Check Out','Status'], ...logs.map(log => [log.employee?.full_name || log.employee?.user?.name || `Emp #${log.employee_id}`, log.employee?.employee_number || '', log.check_in_at ? new Date(log.check_in_at).toLocaleDateString('id-ID') : '', log.status === 'absent' ? '' : (log.check_in_at ? new Date(log.check_in_at).toLocaleTimeString('id-ID') : ''), log.check_out_at ? new Date(log.check_out_at).toLocaleTimeString('id-ID') : '', statusLabel(log.status)])];
        const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        link.download = `draft-rekap-absensi-${periodMode === 'month' ? month : `${dateFrom}-${dateTo}`}.csv`;
        link.click(); URL.revokeObjectURL(link.href);
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
                    <button disabled={!draftReady || !logs.length} onClick={exportCsv} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                        <Download className="h-4 w-4" />
                        <span>Export Draft CSV</span>
                    </button>
                </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2"><Filter className="h-5 w-5 text-emerald-700"/><h2 className="font-bold text-slate-900">Siapkan Draft Rekap</h2></div>
                <div className="grid gap-4 lg:grid-cols-4">
                    <label className="text-sm font-semibold text-slate-700">Cari karyawan<div className="relative mt-2"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={search} onChange={e => {setSearch(e.target.value); setDraftReady(false);}} placeholder="Nama, nomor, atau email" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3"/></div></label>
                    <label className="text-sm font-semibold text-slate-700">Jenis periode<select value={periodMode} onChange={e => {setPeriodMode(e.target.value); setDraftReady(false);}} className="mt-2 w-full rounded-xl border border-slate-200 p-2.5"><option value="month">Per bulan</option><option value="range">Rentang tanggal</option></select></label>
                    {periodMode === 'month' ? <label className="text-sm font-semibold text-slate-700">Bulan<input type="month" value={month} onChange={e => {setMonth(e.target.value);setDraftReady(false);}} className="mt-2 w-full rounded-xl border border-slate-200 p-2.5"/></label> : <><label className="text-sm font-semibold text-slate-700">Dari tanggal<input type="date" value={dateFrom} onChange={e => {setDateFrom(e.target.value);setDraftReady(false);}} className="mt-2 w-full rounded-xl border border-slate-200 p-2.5"/></label><label className="text-sm font-semibold text-slate-700">Sampai tanggal<input type="date" value={dateTo} min={dateFrom} onChange={e => {setDateTo(e.target.value);setDraftReady(false);}} className="mt-2 w-full rounded-xl border border-slate-200 p-2.5"/></label></>}
                </div>
                <div><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Pilih karyawan ({selectedEmployees.length || 'semua'})</span><button onClick={toggleAll} className="text-xs font-bold text-emerald-700">{selectedAll ? 'Hapus semua centang' : 'Centang semua'}</button></div><div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{employees.filter(item => !search.trim() || `${item.full_name} ${item.employee_number || ''} ${item.email || ''}`.toLowerCase().includes(search.toLowerCase())).map(item => <label key={item.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={selectedEmployees.includes(item.id)} onChange={() => {toggleEmployee(item.id);setDraftReady(false);}}/><span className="text-sm"><b className="block text-slate-800">{item.full_name || item.user?.email}</b><small className="text-slate-500">{item.employee_number || item.user?.email || 'Belum lengkap'}</small></span></label>)}</div></div>
                <button onClick={fetchLogs} disabled={loading || (periodMode === 'range' && (!dateFrom || !dateTo))} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Eye className="h-4 w-4"/>{loading ? 'Menyiapkan…' : 'Tampilkan Draft'}</button>
                {draftReady && <p className="text-sm text-emerald-700"><b>Draft siap:</b> {logs.length} catatan sesuai karyawan dan periode terpilih. Periksa tabel sebelum mengekspor.</p>}
                {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={fetchLogs} className="font-bold underline">Coba lagi</button></div>}
            </section>

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
                                <th className="px-6 py-4"><input type="checkbox" checked={selectedAll} onChange={toggleAll} aria-label="Pilih semua karyawan" /></th><th className="px-6 py-4">Karyawan</th>
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
                                        <td className="px-6 py-4"><input type="checkbox" checked={selectedEmployees.includes(log.employee_id)} onChange={() => {toggleEmployee(log.employee_id);setDraftReady(false);}} aria-label={`Pilih ${log.employee?.full_name || log.employee_id}`} /></td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{log.employee?.full_name || log.employee?.user?.name || `Emp #${log.employee_id}`}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-800 font-medium">
                                                {log.check_in_at ? new Date(log.check_in_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-800 font-medium">
                                                {log.status === 'absent' ? '-' : (log.check_in_at ? new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-')}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                                            {log.check_out_at ? new Date(log.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${
                                                log.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' : 
                                                log.status === 'late' ? 'bg-amber-100 text-amber-700' :
                                                log.status === 'absent' ? 'bg-rose-100 text-rose-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.status === 'on_time' ? 'Tepat Waktu' : log.status === 'late' ? 'Terlambat' : log.status === 'absent' ? 'Alpha / Tidak Masuk' : log.status}
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
                                                            onClick={() => {setDetailId(log.id);setActiveDropdown(null);}}
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                                                        >
                                                            <Eye className="h-4 w-4 mr-2 text-emerald-600" /> Lihat Detail
                                                        </button>
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
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
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
                
                <Pagination pagination={pagination} onPageChange={setCurrentPage} />
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
            {detailId && <AttendanceDetailModal attendanceId={detailId} onClose={() => setDetailId(null)} />}
        </div>
    );
};

export default Reports;
