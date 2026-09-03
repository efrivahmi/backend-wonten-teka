import React, { useState, useEffect } from 'react';
import { 
    Banknote, 
    Plus, 
    CheckCircle2, 
    XCircle,
    Clock, 
    Loader2,
    Calendar,
    FileText
} from 'lucide-react';
import api from '../../api';

const Claims = () => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // Modal state for Requesting Claim
    const [showModal, setShowModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        claim_category_id: '',
        amount: '',
        date_of_expense: '',
        description: '',
        attachment_url: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [historyRes, categoriesRes] = await Promise.all([
                api.get('/claims/history'),
                api.get('/claims/categories')
            ]);
            
            setHistory(historyRes.data.data || historyRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error("Error fetching claim data:", error);
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
            await api.post('/claims/submit', formData);
            alert("Pengajuan klaim (reimbursement) berhasil dikirim!");
            setShowModal(false);
            setFormData({ claim_category_id: '', amount: '', date_of_expense: '', description: '', attachment_url: '' });
            fetchData(); // Refresh history
        } catch (error) {
            console.error("Error submitting claim request:", error);
            alert(error.response?.data?.message || "Gagal mengirim pengajuan klaim.");
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Klaim & Reimbursement</h1>
                    <p className="text-slate-500 mt-1">Ajukan pengembalian dana untuk pengeluaran operasional perusahaan.</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Ajukan Klaim Baru</span>
                    </button>
                </div>
            </div>

            {/* Claims History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Banknote className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Riwayat Pengajuan Klaim</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Kategori & Keterangan</th>
                                <th className="px-6 py-4">Tgl Pengeluaran</th>
                                <th className="px-6 py-4">Nominal</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length > 0 ? (
                                history.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{req.category?.name || 'Lain-lain'}</p>
                                            <p className="text-sm text-slate-500 mt-1">{req.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center font-medium text-slate-800">
                                                <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                                                <span>{req.date_of_expense}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-amber-600">{formatCurrency(req.amount)}</span>
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
                                            <Banknote className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Tidak ada riwayat klaim</p>
                                            <p className="text-sm mt-1">Anda belum pernah mengajukan reimbursement.</p>
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
                            <h3 className="font-bold text-lg text-slate-800">Form Pengajuan Klaim</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori Klaim</label>
                                <select 
                                    name="claim_category_id" 
                                    required 
                                    value={formData.claim_category_id}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                >
                                    <option value="">-- Pilih Kategori --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                    <input 
                                        type="number" 
                                        name="amount"
                                        required 
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        min="0"
                                        className="w-full border-slate-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                        placeholder="Contoh: 150000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tgl Pengeluaran</label>
                                    <input 
                                        type="date" 
                                        name="date_of_expense"
                                        required 
                                        value={formData.date_of_expense}
                                        onChange={handleInputChange}
                                        className="w-full border-slate-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Tambahan</label>
                                <textarea 
                                    name="description" 
                                    required 
                                    rows="3"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                    placeholder="Jelaskan secara detail untuk apa dana ini digunakan..."
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lampiran / Bukti (URL/Opsional)</label>
                                <input 
                                    type="url" 
                                    name="attachment_url"
                                    value={formData.attachment_url}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                    placeholder="https://link-ke-bukti-struk..."
                                />
                                <p className="text-xs text-slate-400 mt-1">Untuk MVP, Anda dapat menaruh URL gambar/drive.</p>
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
                                    className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center"
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

export default Claims;
