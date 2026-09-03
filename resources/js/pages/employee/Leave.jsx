import React, { useState, useEffect } from 'react';
import { 
    CalendarRange, 
    Plus, 
    CheckCircle2, 
    XCircle,
    Clock, 
    Loader2,
    FileText
} from 'lucide-react';
import api from '../../api';

const Leave = () => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [balances, setBalances] = useState([]);
    const [types, setTypes] = useState([]);
    
    // Modal state for Requesting Leave
    const [showModal, setShowModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [historyRes, balancesRes, typesRes] = await Promise.all([
                api.get('/leave/history'),
                api.get('/leave/balances'),
                api.get('/leave/types')
            ]);
            
            setHistory(historyRes.data.data || historyRes.data || []);
            setBalances(balancesRes.data || []);
            setTypes(typesRes.data || []);
        } catch (error) {
            console.error("Error fetching leave data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitLoading(true);
            await api.post('/leave/request', formData);
            alert("Pengajuan cuti berhasil dikirim!");
            setShowModal(false);
            setFormData({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
            fetchData(); // Refresh history
        } catch (error) {
            console.error("Error submitting leave request:", error);
            alert(error.response?.data?.message || "Gagal mengirim pengajuan cuti.");
        } finally {
            setSubmitLoading(false);
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
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cuti & Izin</h1>
                    <p className="text-slate-500 mt-1">Kelola jatah cuti dan pantau status pengajuan Anda.</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Ajukan Cuti/Izin</span>
                    </button>
                </div>
            </div>

            {/* Leave Balances */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4">Sisa Kuota Cuti</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {balances.length > 0 ? balances.map((balance) => (
                        <div key={balance.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    {balance.leave_type?.name || 'Cuti Tahunan'}
                                </p>
                                <div className="flex items-baseline space-x-2">
                                    <p className="text-3xl font-bold text-slate-800">{balance.remaining_days}</p>
                                    <p className="text-sm text-slate-500">hari</p>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl">
                                <CalendarRange className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 col-span-3 text-center text-slate-500">
                            Tidak ada data kuota cuti khusus untuk Anda.
                        </div>
                    )}
                </div>
            </div>

            {/* Leave History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Riwayat Pengajuan</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Tipe & Alasan</th>
                                <th className="px-6 py-4">Tanggal Pelaksanaan</th>
                                <th className="px-6 py-4">Durasi</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length > 0 ? (
                                history.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{req.leave_type?.name || 'Cuti'}</p>
                                            <p className="text-sm text-slate-500 mt-1">{req.reason}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-slate-800 font-medium">
                                                <Clock className="h-4 w-4 mr-2 text-slate-400" />
                                                <span>{req.start_date} s/d {req.end_date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-700">{req.total_days} Hari</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${
                                                req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                                                req.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {req.status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                                                {req.status === 'rejected' && <XCircle className="h-3.5 w-3.5 mr-1" />}
                                                {req.status === 'pending' && <Clock className="h-3.5 w-3.5 mr-1" />}
                                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Tidak ada pengajuan cuti</p>
                                            <p className="text-sm mt-1">Anda belum pernah mengajukan cuti atau izin.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Request Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Form Pengajuan Cuti</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Cuti</label>
                                <select 
                                    name="leave_type_id" 
                                    required 
                                    value={formData.leave_type_id}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                >
                                    <option value="">-- Pilih Jenis Cuti --</option>
                                    {types.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                                    <input 
                                        type="date" 
                                        name="start_date"
                                        required 
                                        value={formData.start_date}
                                        onChange={handleInputChange}
                                        className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                                    <input 
                                        type="date" 
                                        name="end_date"
                                        required 
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                        className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Alasan</label>
                                <textarea 
                                    name="reason" 
                                    required 
                                    rows="3"
                                    value={formData.reason}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    placeholder="Jelaskan alasan cuti/izin Anda..."
                                ></textarea>
                            </div>
                            
                            <div className="pt-4 flex items-center justify-end space-x-3">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitLoading}
                                    className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center"
                                >
                                    {submitLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Kirim Pengajuan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leave;
