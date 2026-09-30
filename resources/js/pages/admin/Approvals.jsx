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
    Image as ImageIcon,
    ArrowLeft,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import api from '../../api';

const TYPE_LABELS = {
    leaverequest: 'Cuti',
    claim: 'Klaim / Reimburse',
    overtimerequest: 'Lembur',
    attendanceadjustmentrequest: 'Koreksi Absensi',
    businesstriprequest: 'Perjalanan Dinas',
    shiftexchangerequest: 'Tukar Shift',
    late: 'Terlambat',
    lateness: 'Terlambat',
    telat: 'Terlambat',
    terlambat: 'Terlambat',
    latearrival: 'Terlambat',
    attendancelate: 'Terlambat',
    lateattendance: 'Terlambat',
    latecheckin: 'Terlambat',
};

const normalizeType = (value) => String(value || '').split('\\').pop().toLowerCase().replace(/[^a-z0-9]/g, '');

const formatDate = (value) => {
    if (!value) return '';
    // Date-cast fields from Laravel may serialize with a UTC suffix. Preserve
    // their calendar date instead of shifting a date-only value by timezone.
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const dateOnly = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(dateOnly);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(date);
};

const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const formatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(date);
    return `${formatted} WIB`;
};

const formatTime = (value) => {
    if (!value) return '';
    const match = String(value).match(/(?:T|\s)?(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : String(value);
};

const formatTimeWithWib = (value) => {
    const time = formatTime(value);
    return time ? `${time} WIB` : '';
};

const formatRange = (start, end, formatter) => [formatter(start), formatter(end)].filter(Boolean).join(' – ');

const getTypeKey = (approval) => {
    const flowName = approval?.approval_flow?.name?.replace(/^Persetujuan Admin\s*[-–:]\s*/i, '');
    const candidates = [approval?.approval_flow?.request_type, approval?.approvable_type, flowName]
        .map(normalizeType)
        .filter(Boolean);
    return candidates.find((candidate) => TYPE_LABELS[candidate]) || candidates[0] || '';
};

const getTypeInfo = (approval) => {
    const key = getTypeKey(approval);
    const flowLabel = approval?.approval_flow?.name;
    const label = TYPE_LABELS[key]
        || flowLabel?.replace(/^Persetujuan Admin\s*[-–:]\s*/i, '').replaceAll('_', ' ')
        || (key ? key.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Tipe tidak diketahui');
    const colors = {
        leaverequest: 'bg-emerald-100 text-emerald-800',
        claim: 'bg-amber-100 text-amber-800',
        overtimerequest: 'bg-blue-100 text-blue-800',
        attendanceadjustmentrequest: 'bg-violet-100 text-violet-800',
        businesstriprequest: 'bg-cyan-100 text-cyan-800',
        shiftexchangerequest: 'bg-indigo-100 text-indigo-800',
        late: 'bg-amber-100 text-amber-800',
        lateness: 'bg-amber-100 text-amber-800',
        telat: 'bg-amber-100 text-amber-800',
        terlambat: 'bg-amber-100 text-amber-800',
        latearrival: 'bg-amber-100 text-amber-800',
        attendancelate: 'bg-amber-100 text-amber-800',
        lateattendance: 'bg-amber-100 text-amber-800',
        latecheckin: 'bg-amber-100 text-amber-800',
    };
    return { key, label, color: colors[key] || 'bg-slate-100 text-slate-700' };
};

const getEmployeeName = (data) => data?.employee?.full_name
    || data?.employee?.user?.name
    || '';

const getAttachmentUrl = (approval) => {
    const data = approval?.approvable || {};
    return data.receipt_url || data.attachment_url || null;
};

const isLateType = (type) => ['late', 'lateness', 'telat', 'terlambat', 'latearrival', 'attendancelate', 'lateattendance', 'latecheckin'].includes(type);

const getSummary = (approval) => {
    const data = approval?.approvable || {};
    const type = getTypeInfo(approval).key;
    if (isLateType(type)) {
        return {
            title: data.reason || '',
            subtitle: [formatDate(data.date || data.attendance_date), formatTime(data.check_in || data.check_in_at)].filter(Boolean).join(' · '),
        };
    }
    if (type === 'leaverequest') {
        return {
            title: data.leave_type?.name || '',
            subtitle: [formatRange(data.start_date, data.end_date, formatDate), data.total_days ? `${data.total_days} hari` : ''].filter(Boolean).join(' · '),
        };
    }
    if (type === 'claim') {
        const amount = data.amount === null || data.amount === undefined || data.amount === '' ? null : Number(data.amount);
        return {
            title: data.claim_category?.name || '',
            subtitle: amount !== null && Number.isFinite(amount)
                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
                : '',
        };
    }
    if (type === 'overtimerequest') {
        return {
            title: data.overtime_type || '',
            subtitle: [formatDate(data.date), formatRange(data.start_time, data.end_time, formatTime)].filter(Boolean).join(' · '),
        };
    }
    if (type === 'attendanceadjustmentrequest') {
        return {
            title: data.reason || '',
            subtitle: [formatDate(data.date), formatRange(data.check_in, data.check_out, formatTime)].filter(Boolean).join(' · '),
        };
    }
    if (type === 'businesstriprequest') {
        return {
            title: data.location || '',
            subtitle: formatRange(data.start_date, data.end_date, formatDate),
        };
    }
    return {
        title: data.reason || data.description || data.notes || '',
        subtitle: '',
    };
};

const getDetailFields = (approval) => {
    const data = approval?.approvable || {};
    const type = getTypeInfo(approval).key;
    if (isLateType(type)) return [
        ['Tanggal keterlambatan', formatDate(data.date || data.attendance_date)],
        ['Jam masuk', formatTimeWithWib(data.check_in || data.check_in_at)],
        ['Keterangan', data.reason || data.description],
    ];
    if (type === 'leaverequest') return [
        ['Jenis cuti', data.leave_type?.name],
        ['Periode', formatRange(data.start_date, data.end_date, formatDate)],
        ['Jumlah hari', data.total_days ? `${data.total_days} hari` : null],
        ['Alasan', data.reason],
    ];
    if (type === 'claim') return [
        ['Kategori', data.claim_category?.name],
        ['Tanggal pengeluaran', formatDate(data.expense_date)],
        ['Jumlah', data.amount !== null && data.amount !== undefined && data.amount !== '' && Number.isFinite(Number(data.amount))
            ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(data.amount))
            : null],
        ['Keterangan', data.description],
    ];
    if (type === 'overtimerequest') return [
        ['Jenis lembur', data.overtime_type],
        ['Tanggal', formatDate(data.date)],
        ['Waktu', formatRange(data.start_time, data.end_time, formatTime)],
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
        ['Periode', formatRange(data.start_date, data.end_date, formatDate)],
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
                                            <p className="mt-1 truncate text-xs text-slate-500" title={summary.subtitle}>{summary.subtitle}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600"><Clock className="h-4 w-4 shrink-0 text-slate-400" /><time dateTime={approval.created_at}>{formatDateTime(approval.created_at)}</time></div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {actionLoading === approval.id ? <Loader2 className="ml-auto h-6 w-6 animate-spin text-slate-400" /> : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link to={`/admin/approvals/${approval.id}`} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50" title="Lihat detail" aria-label={`Lihat detail pengajuan ${approval.id}`}><Eye className="h-5 w-5" /></Link>
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

        </div>
    );
};

export function ApprovalDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [approval, setApproval] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const loadApproval = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/approvals/${id}`);
            setApproval(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Detail pengajuan gagal dimuat.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadApproval(); }, [loadApproval]);

    const decide = async (decision) => {
        setBusy(true);
        try {
            await api.post(`/approvals/${id}/action`, { decision, comment: '' });
            navigate('/admin/approvals', { replace: true });
        } catch (requestError) {
            window.alert(requestError.response?.data?.message || 'Gagal memproses persetujuan.');
        } finally {
            setBusy(false);
        }
    };

    const data = approval?.approvable || {};
    const type = getTypeInfo(approval);
    const employeeName = getEmployeeName(data);
    const attachmentUrl = getAttachmentUrl(approval);
    const isImage = attachmentUrl && /\.(png|jpe?g|gif|webp|bmp)(?:$|[?#])/i.test(attachmentUrl);

    return (
        <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 md:p-8">
            <Link to="/admin/approvals" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Kembali ke persetujuan</Link>
            {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : error ? (
                <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800"><p>{error}</p><button onClick={loadApproval} className="mt-3 font-bold underline">Coba lagi</button></div>
            ) : approval && <>
                <header className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${type.color}`}>{type.label}</span>
                    <h1 className="mt-3 text-2xl font-black text-slate-900">Detail pengajuan</h1>
                    <p className="mt-1 text-slate-600">{employeeName}{data.employee?.employee_number ? ` · NIP ${data.employee.employee_number}` : ''}</p>
                    <p className="mt-2 text-sm text-slate-600">Diajukan {formatDateTime(approval.created_at)}</p>
                </header>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="mb-4 text-lg font-black text-slate-900">Informasi pengajuan</h2>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        {getDetailFields(approval).map(([label, value]) => (
                            <div key={label} className="min-h-20 rounded-xl bg-slate-50 p-4">
                                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                                <dd className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-slate-800">{value ?? ''}</dd>
                            </div>
                        ))}
                        <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-2 text-sm font-semibold capitalize text-slate-800">{String(approval.overall_status || '').replaceAll('_', ' ')}</dd></div>
                    </dl>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><ImageIcon className="h-5 w-5 text-emerald-700" />Lampiran</h2>
                    {attachmentUrl ? isImage ? <a href={attachmentUrl} target="_blank" rel="noreferrer" className="inline-block max-w-full"><img src={attachmentUrl} alt={`Lampiran ${type.label} dari ${employeeName}`} className="max-h-[520px] max-w-full rounded-xl bg-slate-50 object-contain" /><span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">Buka gambar ukuran penuh <ExternalLink className="h-4 w-4" /></span></a> : <a href={attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 font-bold text-emerald-800"><FileText className="h-5 w-5" />Buka / unduh lampiran <ExternalLink className="h-4 w-4" /></a> : <p className="text-sm text-slate-500">Tidak ada lampiran.</p>}
                </section>
                {approval.overall_status === 'pending' && <div className="flex flex-wrap justify-end gap-3"><button disabled={busy} onClick={() => decide('reject')} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-5 py-3 font-bold text-rose-700 disabled:opacity-50"><XCircle className="h-5 w-5" />Tolak</button><button disabled={busy} onClick={() => decide('approve')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-5 w-5" />Setujui</button></div>}
            </>}
        </main>
    );
}

export default Approvals;
