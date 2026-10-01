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
import Pagination from '../../components/Pagination';
import api from '../../api';

const Payslip = () => {
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState([]);
    
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchPayslips();
    }, [currentPage]);

    const fetchPayslips = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/payslips?page=${currentPage}`);
            setPagination(response.data);
            setPayslips(response.data.data || response.data || []);
        } catch (error) {
            console.error("Error fetching payslips:", error);
            setErrorMessage(error.response?.data?.message || 'Riwayat slip gaji gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (id) => {
        setErrorMessage('');
        try {
            const response = await api.get(`/payslips/${id}`);
            setSelectedSlip(response.data);
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Rincian slip gagal dimuat.');
        }
    };

    const handleDownload = async (id, period) => {
        try {
            const response = await api.get(`/payslips/${id}/download`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `slip-gaji-${period}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
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

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 md:p-5">
                <p className="font-semibold">Cara membaca status gaji</p>
                <p className="mt-1 text-emerald-900">“Tersedia untuk diambil” berarti slip sudah diterbitkan—hubungi bagian administrasi/keuangan untuk menerima gaji. “Sudah diambil” dicatat setelah penyerahan dikonfirmasi. “Belum diproses” berarti slip belum diterbitkan oleh admin.</p>
            </div>

            {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{errorMessage}</div>}

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
                                                <p>{slip.payroll_run?.period_month ? new Date(2000, slip.payroll_run.period_month - 1, 1).toLocaleDateString('id-ID', { month: 'long' }) + ' ' + slip.payroll_run.period_year : formatMonthYear(slip.period_start)}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{slip.period_start} - {slip.period_end}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-emerald-600 text-lg">{formatCurrency(slip.net_salary)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                                slip.payment_status === 'collected' ? 'bg-blue-100 text-blue-700' : slip.payment_status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {{ collected: 'Sudah diambil', available: 'Tersedia untuk diambil', pending: 'Belum diproses' }[slip.payment_status] || 'Belum diproses'}
                                            </span>
                                            {slip.payment_status === 'available' && <small className="mt-1 block text-slate-500">Silakan hubungi administrasi/keuangan untuk mengambil gaji.</small>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    onClick={() => handleView(slip.id)}
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
                
                <Pagination pagination={pagination} onPageChange={setCurrentPage} />
            </div>

            {selectedSlip && <section className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-7">
                <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Rincian slip gaji</h2><p className="text-sm text-slate-500">Periode {selectedSlip.period_start} – {selectedSlip.period_end}</p></div><button onClick={() => setSelectedSlip(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Tutup</button></div>
                <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><small className="text-slate-500">Penghasilan bruto</small><b className="mt-1 block">{formatCurrency(selectedSlip.gross_salary)}</b></div><div className="rounded-xl bg-rose-50 p-4"><small className="text-rose-700">Total potongan</small><b className="mt-1 block text-rose-800">{formatCurrency(selectedSlip.total_deductions)}</b></div><div className="rounded-xl bg-emerald-50 p-4"><small className="text-emerald-700">Gaji bersih</small><b className="mt-1 block text-emerald-800">{formatCurrency(selectedSlip.net_salary)}</b></div></div>
                <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Komponen</th><th className="p-3">Jenis</th><th className="p-3 text-right">Jumlah</th></tr></thead><tbody className="divide-y divide-slate-100">{(selectedSlip.components_detail||[]).map((item,index)=><tr key={`${item.name}-${index}`}><td className="p-3">{item.name}</td><td className="p-3 capitalize">{item.type==='earning'?'Penghasilan':'Potongan'}{item.days?` · ${item.days} hari`:''}</td><td className="p-3 text-right font-medium">{formatCurrency(item.amount)}</td></tr>)}{!(selectedSlip.components_detail||[]).length&&<tr><td colSpan="3" className="p-6 text-center text-slate-500">Tidak ada rincian komponen.</td></tr>}</tbody></table></div>
            </section>}
        </div>
    );
};

export default Payslip;
