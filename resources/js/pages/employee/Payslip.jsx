import React, { useState, useEffect } from 'react';
import { 
    Receipt, 
    Download, 
    Eye,
    Loader2,
    Calendar,
    FileText,
    Wallet
} from 'lucide-react';
import api from '../../api';

const Payslip = () => {
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState([]);

    useEffect(() => {
        fetchPayslips();
    }, []);

    const fetchPayslips = async () => {
        try {
            setLoading(true);
            const response = await api.get('/payslips');
            setPayslips(response.data.data || response.data || []);
        } catch (error) {
            console.error("Error fetching payslips:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id, period) => {
        try {
            // For MVP, we'll just mock a download or open a new tab to the API endpoint
            // In a real app, you'd fetch the blob and trigger a download prompt
            const token = localStorage.getItem('token');
            window.open(`http://localhost:8000/api/payslips/${id}/download?token=${token}`, '_blank');
        } catch (error) {
            console.error("Error downloading payslip:", error);
            alert("Gagal mengunduh slip gaji.");
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

    const formatMonthYear = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Slip Gaji</h1>
                    <p className="text-slate-500 mt-1">Akses dan unduh slip gaji bulanan Anda dengan aman.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Wallet className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Riwayat Slip Gaji Terakhir</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Periode</th>
                                <th className="px-6 py-4">Total Gaji Bersih (THP)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payslips.length > 0 ? (
                                payslips.map((slip) => (
                                    <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center font-bold text-slate-800">
                                                <Calendar className="h-5 w-5 mr-3 text-slate-400" />
                                                <div>
                                                    <p>{formatMonthYear(slip.period_start)}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{slip.period_start} - {slip.period_end}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-emerald-600 text-lg">{formatCurrency(slip.net_salary)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                                slip.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {slip.status === 'published' ? 'Tersedia' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownload(slip.id, slip.period_start)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Unduh PDF"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Receipt className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Tidak ada slip gaji</p>
                                            <p className="text-sm mt-1">Belum ada slip gaji yang dipublikasikan untuk Anda.</p>
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

export default Payslip;
