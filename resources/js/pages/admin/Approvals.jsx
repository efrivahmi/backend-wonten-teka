import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    FileText, 
    Clock, 
    Filter
} from 'lucide-react';
import api from '../../api';

const Approvals = () => {
    const [loading, setLoading] = useState(true);
    const [approvals, setApprovals] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchApprovals();
    }, []);

    const fetchApprovals = async () => {
        try {
            setLoading(true);
            const response = await api.get('/approvals/pending');
            // Assuming response is paginated (has .data array)
            setApprovals(response.data.data || []);
        } catch (error) {
            console.error("Error fetching approvals:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, decision) => {
        try {
            setActionLoading(id);
            await api.post(`/approvals/${id}/action`, { decision, comment: '' });
            // Remove the acted item from the list
            setApprovals((prev) => prev.filter((app) => app.id !== id));
        } catch (error) {
            console.error("Error processing approval action:", error);
            alert("Gagal memproses persetujuan. Silakan coba lagi.");
        } finally {
            setActionLoading(null);
        }
    };

    const getRequestTypeInfo = (typeString) => {
        if (!typeString) return { label: 'Lainnya', color: 'bg-slate-100 text-slate-800' };
        if (typeString.includes('Leave')) return { label: 'Cuti', color: 'bg-emerald-100 text-emerald-800' };
        if (typeString.includes('Overtime')) return { label: 'Lembur', color: 'bg-blue-100 text-blue-800' };
        if (typeString.includes('Claim')) return { label: 'Klaim', color: 'bg-amber-100 text-amber-800' };
        if (typeString.includes('Device')) return { label: 'Perangkat', color: 'bg-indigo-100 text-indigo-800' };
        return { label: 'Lainnya', color: 'bg-slate-100 text-slate-800' };
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
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Pusat Persetujuan</h1>
                    <p className="text-slate-500 mt-1">Kelola dan tinjau semua pengajuan karyawan di sini.</p>
                </div>
                <div className="flex space-x-2">
                    <button className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                        <Filter className="h-4 w-4" />
                        <span>Filter</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Pengaju</th>
                                <th className="px-6 py-4">Tipe Pengajuan</th>
                                <th className="px-6 py-4">Detail</th>
                                <th className="px-6 py-4">Tanggal Pengajuan</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {approvals.length > 0 ? (
                                approvals.map((approval) => {
                                    const typeInfo = getRequestTypeInfo(approval.approvable_type);
                                    const approvableData = approval.approvable || {};
                                    
                                    // Detail text mapping
                                    let detailText = approvableData.reason || approvableData.notes || 'Pengajuan standar';
                                    let subDetailText = approvableData.start_date ? `${approvableData.start_date} s/d ${approvableData.end_date}` : '';
                                    
                                    if (approval.approvable_type && approval.approvable_type.includes('Device')) {
                                        detailText = approvableData.device_name || 'Perangkat Baru';
                                        subDetailText = `OS: ${approvableData.os_version || '-'}`;
                                    }

                                    return (
                                        <tr key={approval.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">
                                                        <FileText className="h-5 w-5 opacity-50" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">
                                                            {/* User name logic depends on actual relationship. Fallback for MVP */}
                                                            Karyawan #{approvableData.employee_id || '?'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">ID Pengajuan: {approval.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm font-medium text-slate-800 truncate" title={detailText}>
                                                    {detailText}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate" title={subDetailText}>
                                                    {subDetailText}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm text-slate-500">
                                                    <Clock className="h-4 w-4 mr-2 opacity-70" />
                                                    {new Date(approval.created_at).toLocaleDateString('id-ID')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {actionLoading === approval.id ? (
                                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400 inline-block" />
                                                ) : (
                                                    <div className="flex justify-end space-x-2">
                                                        <button 
                                                            onClick={() => handleAction(approval.id, 'reject')}
                                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Tolak"
                                                        >
                                                            <XCircle className="h-6 w-6" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(approval.id, 'approve')}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Setujui"
                                                        >
                                                            <CheckCircle2 className="h-6 w-6" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <CheckCircle2 className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Semua Beres!</p>
                                            <p className="text-sm">Tidak ada antrean persetujuan saat ini.</p>
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

export default Approvals;
