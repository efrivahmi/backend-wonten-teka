import React, { useCallback, useEffect, useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    FileText,
    Clock,
    Filter,
    Trash2,
    Eye,
    ExternalLink,
    X,
    Image as ImageIcon,
} from 'lucide-react';
import Pagination from '../../components/Pagination';
import api from '../../api';

const TYPE_LABELS = {
    leaverequest: 'Cuti',
    claim: 'Klaim / Reimburse',
    overtimerequest: 'Lembur',
    attendanceadjustmentrequest: 'Koreksi Absensi',
    businesstriprequest: 'Perjalanan Dinas',
    shiftexchangerequest: 'Tukar Shift',
};

const formatDate = (value) => {
    if (!value) return '—';
    // Date-cast fields from Laravel may serialize with a UTC suffix. Preserve
    // their calendar date instead of shifting a date-only value by timezone.
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(date);
};

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const formatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(date);
    return `${formatted} WIB`;
};

const formatTime = (value) => {
    if (!value) return '—';
    const match = String(value).match(/(?:T|\s)?(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : String(value);
};

const formatTimeWithWib = (value) => {
    const time = formatTime(value);
    return time === '—' ? time : `${time} WIB`;
};

const getTypeKey = (approval) => {
    const type = approval?.approvable_type?.split('\\').pop()?.toLowerCase();
    if (type) return type;
    return String(approval?.approval_flow?.request_type || '').replaceAll('_', '').toLowerCase();
};

const getTypeInfo = (approval) => {
    const key = getTypeKey(approval);
    const flowLabel = approval?.approval_flow?.name;
    const label = TYPE_LABELS[key]
        || flowLabel
        || (key ? key.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Tipe tidak diketahui');
    const colors = {
        leaverequest: 'bg-emerald-100 text-emerald-800',
        claim: 'bg-amber-100 text-amber-800',
        overtimerequest: 'bg-blue-100 text-blue-800',
        attendanceadjustmentrequest: 'bg-violet-100 text-violet-800',
        businesstriprequest: 'bg-cyan-100 text-cyan-800',
        shiftexchangerequest: 'bg-indigo-100 text-indigo-800',
    };
    return { key, label, color: colors[key] || 'bg-slate-100 text-slate-700' };
};

const getEmployeeName = (data) => data?.employee?.full_name
    || data?.employee?.user?.name
    || (data?.employee_id ? `Karyawan #${data.employee_id}` : null)
    || 'Profil karyawan tidak tersedia';

const getAttachmentUrl = (approval) => {
    const data = approval?.approvable || {};
    return data.receipt_url || data.attachment_url || null;
};

const getSummary = (approval) => {
    const data = approval?.approvable || {};
    const type = getTypeInfo(approval).key;
    if (type === 'leaverequest') {
        return {
            title: data.leave_type?.name || 'Permohonan cuti',
            subtitle: `${formatDate(data.start_date)} – ${formatDate(data.end_date)}${data.total_days ? ` · ${data.total_days} hari` : ''}`,
        };
    }
    if (type === 'claim') {
        const amount = Number(data.amount);
        return {
            title: data.claim_category?.name || 'Klaim / Reimburse',
            subtitle: Number.isFinite(amount)
                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
                : 'Nilai klaim belum tersedia',
        };
    }
    if (type === 'overtimerequest') {
        return {
            title: data.overtime_type || 'Pengajuan lembur',
            subtitle: `${formatDate(data.date)} · ${formatTime(data.start_time)}–${formatTime(data.end_time)}`,
        };
    }
    if (type === 'attendanceadjustmentrequest') {
        return {
            title: 'Koreksi catatan absensi',
            subtitle: `${formatDate(data.date)} · ${formatTime(data.check_in)}–${formatTime(data.check_out)}`,
        };
    }
    if (type === 'businesstriprequest') {
        return {
            title: data.location || 'Perjalanan dinas',
            subtitle: `${formatDate(data.start_date)} – ${formatDate(data.end_date)}`,
        };
    }
    return {
        title: data.reason || data.description || data.notes || 'Detail belum ditambahkan',
        subtitle: '',
    };
};

const getDetailFields = (approval) => {
    const data = approval?.approvable || {};
    const type = getTypeInfo(approval).key;
    if (type === 'leaverequest') return [
        ['Jenis cuti', data.leave_type?.name],
        ['Periode', `${formatDate(data.start_date)} – ${formatDate(data.end_date)}`],
        ['Jumlah hari', data.total_days ? `${data.total_days} hari` : null],
        ['Alasan', data.reason],
    ];
    if (type === 'claim') return [
        ['Kategori', data.claim_category?.name],
        ['Tanggal pengeluaran', formatDate(data.expense_date)],
        ['Jumlah', Number.isFinite(Number(data.amount))
            ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(data.amount))
            : null],
        ['Keterangan', data.description],
    ];
    if (type === 'overtimerequest') return [
        ['Jenis lembur', data.overtime_type],
        ['Tanggal', formatDate(data.date)],
        ['Waktu', `${formatTime(data.start_time)}–${formatTime(data.end_time)}`],
        ['Alasan', data.reason],
    ];
    if (type === 'attendanceadjustmentrequest') return [
        ['Tanggal absensi', formatDate(data.date)],
        ['Jam masuk yang diajukan', formatTimeWithWib(data.check_in)],
        ['Jam keluar yang diajukan', formatTimeWithWib(data.check_out)],
        ['Alasan koreksi', data.reason],
    ];
    if (type === 'businesstriprequest') return [
        ['Lokasi tujuan', data.location],
        ['Periode', `${formatDate(data.start_date)} – ${formatDate(data.end_date)}`],
        ['Keperluan', data.description],
    ];
    return [
        ['Jenis pengajuan', approval?.approval_flow?.name || getTypeInfo(approval).label],
        ['Keterangan', data.reason || data.description || data.notes],
    ];
};

const Approvals = ({ filter = null }) => {
    const [loading, setLoading] = useState(true);
    const [approvals, setApprovals] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [loadError, setLoadError] = useState('');
    const [selectedApproval, setSelectedApproval] = useState(null);

    const fetchApprovals = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError('');
            const params = { page: currentPage };
            if (filter === 'Claim') params.type = 'claim';
            const response = await api.get('/approvals/pending', { params });
            setPagination(response.data);
            setApprovals(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching approvals:', error);
            setLoadError(error.response?.data?.message || 'Data persetujuan gagal dimuat. Periksa koneksi lalu coba lagi.');
        } finally {
            setLoading(false);
        }
    }, [filter, currentPage]);

    useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

    const handleAction = async (id, decision) => {
        try {
            setActionLoading(id);
            await api.post(`/approvals/${id}/action`, { decision, comment: '' });
            setSelectedApproval(null);
            await fetchApprovals();
        } catch (error) {
            console.error('Error processing approval action:', error);
            window.alert(error.response?.data?.message || 'Gagal memproses persetujuan. Silakan coba lagi.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin menghapus pengajuan ini secara permanen? Data pengajuan terkait juga akan dihapus.')) return;
        try {
            setActionLoading(id);
            await api.delete(`/approvals/${id}`);
            setSelectedApproval(null);
            await fetchApprovals();
        } catch (error) {
            console.error('Error deleting approval:', error);
            window.alert(error.response?.data?.message || 'Gagal menghapus pengajuan.');
        } finally {
            setActionLoading(null);
        }
    };

    const isClaimPage = filter === 'Claim';

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
                        {isClaimPage ? 'Klaim & Reimburse' : 'Pusat Persetujuan'}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {isClaimPage ? 'Tinjau pengajuan biaya dan reimbursement karyawan.' : 'Tinjau rincian pengajuan sebelum menyetujui atau menolaknya.'}
                    </p>
                </div>
                <button onClick={fetchApprovals} className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50" aria-label="Muat ulang daftar">
                    <Filter className="h-4 w-4" /><span>Muat ulang</span>
                </button>
            </div>

            {loadError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <span>{loadError}</span>
                    <button onClick={fetchApprovals} className="rounded-lg bg-white px-3 py-2 font-bold">Coba lagi</button>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                                <th className="px-5 py-4">Pengaju</th>
                                <th className="px-5 py-4">Jenis pengajuan</th>
                                <th className="px-5 py-4">Ringkasan</th>
                                <th className="px-5 py-4">Diajukan pada</th>
                                <th className="px-5 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-5 py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" /><span className="mt-2 block text-sm text-slate-500">Memuat pengajuan…</span></td></tr>
                            ) : approvals.length ? approvals.map((approval) => {
                                const type = getTypeInfo(approval);
                                const data = approval.approvable || {};
                                const summary = getSummary(approval);
                                const employeeName = getEmployeeName(data);
                                return (
                                    <tr key={approval.id} className="align-middle transition-colors hover:bg-emerald-50/30">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><FileText className="h-5 w-5" /></div>
                                                <div className="min-w-0">
                                                    <p className="max-w-[180px] truncate font-bold text-slate-800" title={employeeName}>{employeeName}</p>
                                                    <p className="text-xs text-slate-500">ID pengajuan: {approval.id}{data.employee?.employee_number ? ` · NIP ${data.employee.employee_number}` : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${type.color}`}>{type.label}</span></td>
                                        <td className="max-w-[300px] px-5 py-4">
                                            <p className="truncate text-sm font-semibold text-slate-800" title={summary.title}>{summary.title}</p>
                                            <p className="mt-1 truncate text-xs text-slate-500" title={summary.subtitle}>{summary.subtitle || 'Buka detail untuk melihat keterangan'}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600"><Clock className="h-4 w-4 shrink-0 text-slate-400" /><time dateTime={approval.created_at}>{formatDateTime(approval.created_at)}</time></div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {actionLoading === approval.id ? <Loader2 className="ml-auto h-6 w-6 animate-spin text-slate-400" /> : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setSelectedApproval(approval)} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50" title="Lihat detail" aria-label={`Lihat detail pengajuan ${approval.id}`}><Eye className="h-5 w-5" /></button>
                                                    <button onClick={() => handleDelete(approval.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus permanen" aria-label={`Hapus pengajuan ${approval.id}`}><Trash2 className="h-5 w-5" /></button>
                                                    <button onClick={() => handleAction(approval.id, 'reject')} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Tolak" aria-label={`Tolak pengajuan ${approval.id}`}><XCircle className="h-6 w-6" /></button>
                                                    <button onClick={() => handleAction(approval.id, 'approve')} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" title="Setujui" aria-label={`Setujui pengajuan ${approval.id}`}><CheckCircle2 className="h-6 w-6" /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="5" className="px-5 py-16 text-center">
                                    <CheckCircle2 className="mx-auto mb-3 h-11 w-11 text-emerald-300" />
                                    <p className="font-bold text-slate-800">Tidak ada pengajuan tertunda</p>
                                    <p className="mt-1 text-sm text-slate-500">Daftar ini akan terisi saat ada pengajuan baru.</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination pagination={pagination} onPageChange={setCurrentPage} />
            </div>

            {selectedApproval && <ApprovalDetailModal
                approval={selectedApproval}
                busy={actionLoading === selectedApproval.id}
                onClose={() => setSelectedApproval(null)}
                onDecision={(decision) => handleAction(selectedApproval.id, decision)}
            />}
        </div>
    );
};

function ApprovalDetailModal({ approval, busy, onClose, onDecision }) {
    const data = approval.approvable || {};
    const type = getTypeInfo(approval);
    const attachmentUrl = getAttachmentUrl(approval);
    const isImage = attachmentUrl && /\.(png|jpe?g|gif|webp|bmp)(?:$|[?#])/i.test(attachmentUrl);
    const employeeName = getEmployeeName(data);
    const fields = getDetailFields(approval).filter(([, value]) => value !== null && value !== undefined && value !== '');

    useEffect(() => {
        const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="approval-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur">
                    <div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${type.color}`}>{type.label}</span>
                        <h2 id="approval-detail-title" className="mt-2 text-xl font-black text-slate-900">Detail pengajuan</h2>
                        <p className="mt-1 text-sm text-slate-500">Diajukan oleh <strong className="text-slate-700">{employeeName}</strong> · {formatDateTime(approval.created_at)}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup detail"><X className="h-5 w-5" /></button>
                </header>
                <div className="space-y-5 p-5">
                    <dl className="grid gap-3 sm:grid-cols-2">
                        {fields.map(([label, value]) => (
                            <div key={label} className="rounded-xl bg-slate-50 p-3 sm:col-span-1">
                                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                                <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-800">{value}</dd>
                            </div>
                        ))}
                        <div className="rounded-xl bg-slate-50 p-3">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Dibuat pada</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-800">{formatDateTime(approval.created_at)}</dd>
                        </div>
                    </dl>
                    {attachmentUrl ? (
                        <div className="rounded-xl border border-slate-200 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><ImageIcon className="h-4 w-4" />Lampiran</h3>
                            {isImage ? <a href={attachmentUrl} target="_blank" rel="noreferrer" className="group block">
                                <img src={attachmentUrl} alt={`Lampiran ${type.label} dari ${employeeName}`} className="max-h-[360px] w-full rounded-lg bg-slate-50 object-contain" />
                                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">Buka gambar ukuran penuh <ExternalLink className="h-4 w-4" /></span>
                            </a> : <a href={attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"><FileText className="h-5 w-5" />Buka / unduh lampiran<ExternalLink className="h-4 w-4" /></a>}
                        </div>
                    ) : <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Tidak ada lampiran pada pengajuan ini.</div>}
                </div>
                <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-5">
                    <button disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Tutup</button>
                    <button disabled={busy} onClick={() => onDecision('reject')} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Tolak</button>
                    <button disabled={busy} onClick={() => onDecision('approve')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Setujui</button>
                </footer>
            </section>
        </div>
    );
}

export default Approvals;
