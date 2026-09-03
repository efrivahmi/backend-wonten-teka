import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    Plus, 
    CheckCircle2, 
    XCircle,
    Loader2,
    Calendar,
    FileText
} from 'lucide-react';
import api from '../../api';

const Overtime = () => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    
    // Modal state for Requesting Overtime
    const [showModal, setShowModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        start_time: '',
        end_time: '',
        notes: ''
    });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/overtime/history');
            setHistory(response.data.data || response.data || []);
        } catch (error) {
            console.error("Error fetching overtime history:", error);
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
            await api.post('/overtime/request', formData);
            alert("Pengajuan lembur berhasil dikirim!");
            setShowModal(false);
            setFormData({ date: '', start_time: '', end_time: '', notes: '' });
            fetchHistory(); // Refresh history
        } catch (error) {
            console.error("Error submitting overtime request:", error);
            alert(error.response?.data?.message || "Gagal mengirim pengajuan lembur.");
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
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Lembur</h1>
                    <p className="text-slate-500 mt-1">Ajukan jam lembur dan pantau status persetujuannya.</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Ajukan Lembur</span>
                    </button>
                </div>
            </div>

            {/* Overtime History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Riwayat Pengajuan Lembur</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Tanggal Lembur</th>
                                <th className="px-6 py-4">Jam Mulai - Selesai</th>
                                <th className="px-6 py-4">Catatan / Alasan</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length > 0 ? (
                                history.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center font-bold text-slate-800">
                                                <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                                                <span>{req.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-slate-600 font-medium">
                                                <Clock className="h-4 w-4 mr-2 text-slate-400" />
                                                <span>{req.start_time.substring(0, 5)} - {req.end_time.substring(0, 5)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-500 max-w-xs truncate">{req.notes || '-'}</p>
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
                                            <p className="text-lg font-medium text-slate-800">Tidak ada pengajuan lembur</p>
                                            <p className="text-sm mt-1">Anda belum pernah mengajukan jam kerja tambahan.</p>
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
                            <h3 className="font-bold text-lg text-slate-800">Form Pengajuan Lembur</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Pelaksanaan Lembur</label>
                                <input 
                                    type="date" 
                                    name="date"
                                    required 
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
                                    <input 
                                        type="time" 
                                        name="start_time"
                                        required 
                                        value={formData.start_time}
                                        onChange={handleInputChange}
                                        className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
                                    <input 
                                        type="time" 
                                        name="end_time"
                                        required 
                                        value={formData.end_time}
                                        onChange={handleInputChange}
                                        className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pekerjaan / Catatan</label>
                                <textarea 
                                    name="notes" 
                                    required 
                                    rows="3"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Jelaskan apa yang Anda kerjakan selama lembur..."
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
                                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center"
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

export default Overtime;
