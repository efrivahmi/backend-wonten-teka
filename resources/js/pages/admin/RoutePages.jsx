import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, Download, Eye, FileClock, Loader2, MapPin, Save, Settings2 } from 'lucide-react';
import api from '../../api';
import ShiftAssignmentForm from './ShiftAssignmentForm';
import AttendanceDetailModal from './AttendanceDetailModal';

const Shell = ({ icon: Icon, title, subtitle, children }) => (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800"><Icon /></div>
            <div><h1 className="text-3xl font-bold text-slate-900">{title}</h1><p className="mt-1 text-slate-500">{subtitle}</p></div>
        </div>
        {children}
    </div>
);

const Loading = () => <div className="flex justify-center p-16"><Loader2 className="animate-spin text-emerald-700" /></div>;
const statusLabel = value => ({on_time:'Tepat Waktu', late:'Terlambat', absent:'Alpha', leave:'Cuti'}[value] || value || 'Belum lengkap');
const statusStyle = value => value === 'late' ? 'bg-amber-100 text-amber-800' : value === 'absent' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800';

export function ShiftAssignmentsPage() {
    return <Shell icon={CalendarCheck} title="Penugasan Shift" subtitle="Tetapkan shift khusus atau jadwal mingguan kepada karyawan."><ShiftAssignmentForm /></Shell>;
}

export function AttendanceDailyPage() {
    const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [detailId,setDetailId]=useState(null);
    const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const today = localDate(new Date());
    const load = async () => { setLoading(true); setError(''); try { const response = await api.get('/admin/attendance',{params:{date_from:today,date_to:today,per_page:500}}); setRows(Array.isArray(response.data?.data) ? response.data.data : []); } catch (e) { setError(e.response?.data?.message || 'Tabel absensi harian belum dapat dimuat.'); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);
    return <><Shell icon={CalendarCheck} title="Kehadiran Harian" subtitle={`Pantau pencatatan masuk dan pulang tanggal ${new Date().toLocaleDateString('id-ID')}.`}>{loading ? <Loading /> : error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700"><p>{error}</p><button onClick={load} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 font-semibold text-white">Coba lagi</button></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Karyawan</th><th className="p-4">Masuk</th><th className="p-4">Pulang</th><th className="p-4">Status</th><th className="p-4 text-right">Detail</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id}><td className="p-4 font-semibold text-slate-800">{row.employee?.full_name || row.employee?.user?.name || `Karyawan #${row.employee_id}`}</td><td className="p-4">{row.status === 'absent' || !row.check_in_at ? 'Tidak hadir' : new Date(row.check_in_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td><td className="p-4">{row.check_out_at ? new Date(row.check_out_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : row.status === 'absent' ? '—' : 'Belum pulang'}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(row.status)}`}>{statusLabel(row.status)}</span></td><td className="p-4 text-right"><button onClick={()=>setDetailId(row.id)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"><Eye className="h-4 w-4"/>Lihat</button></td></tr>)}{rows.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-500">Belum ada kehadiran hari ini.</td></tr>}</tbody></table></div>}</Shell>{detailId&&<AttendanceDetailModal attendanceId={detailId} onClose={()=>setDetailId(null)}/>}</>;
}

export function DepartmentAnalyticsPage() {
    const [data, setData] = useState([]); const [loading, setLoading] = useState(true);
    useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data.data?.department_attendance || [])).finally(() => setLoading(false)); }, []);
    return <Shell icon={BarChart3} title="Analitik Departemen" subtitle="Perbandingan kehadiran hari ini berdasarkan departemen, tanpa mencampurnya dengan laporan rinci.">{loading ? <Loading /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map(item => <article key={item.department} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex justify-between"><h2 className="font-bold text-slate-900">{item.department}</h2><strong className="text-emerald-700">{item.attendance_rate}%</strong></div><div className="my-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-600" style={{width:`${Math.min(100,item.attendance_rate)}%`}} /></div><div className="grid grid-cols-3 text-center text-sm"><div><b>{item.present}</b><small className="block text-slate-500">Hadir</small></div><div><b>{item.late}</b><small className="block text-slate-500">Terlambat</small></div><div><b>{item.absent}</b><small className="block text-slate-500">Belum hadir</small></div></div></article>)}{data.length === 0 && <p className="text-slate-500">Data departemen belum tersedia.</p>}</div>}</Shell>;
}

export function ExportCenterPage() {
    const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
    useEffect(() => { api.get('/admin/attendance').then(r => setRows(r.data.data || [])).finally(() => setLoading(false)); }, []);
    const exportCsv = () => { const values = [['Karyawan','Tanggal','Masuk','Pulang','Status'], ...rows.map(r => [r.employee?.user?.name || r.employee?.full_name || r.employee_id, r.check_in_at?.slice(0,10) || '', r.check_in_at || '', r.check_out_at || '', statusLabel(r.status)])]; const csv = values.map(line => line.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n'); const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([`\uFEFF${csv}`],{type:'text/csv;charset=utf-8'})); link.download=`rekap-absensi-${new Date().toLocaleDateString('en-CA')}.csv`; link.click(); URL.revokeObjectURL(link.href); };
    return <Shell icon={Download} title="Pusat Ekspor" subtitle="Unduh data absensi untuk pengolahan dan arsip eksternal."><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-900">Rekap Absensi</h2><p className="mt-1 text-sm text-slate-500">{loading ? 'Menyiapkan data…' : `${rows.length} catatan siap diekspor.`}</p><button disabled={loading} onClick={exportCsv} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"><Download size={18}/>Unduh CSV</button></div></Shell>;
}

export function AuditLogsPage() {
    const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
    useEffect(() => { api.get('/admin/audit-logs').then(r => setRows(r.data.data || [])).finally(() => setLoading(false)); }, []);
    return <Shell icon={FileClock} title="Log Audit" subtitle="Jejak perubahan administratif yang bersifat hanya-baca.">{loading ? <Loading /> : <div className="space-y-3">{rows.map(row => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><b className="text-slate-900">{row.action}</b><time className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString('id-ID')}</time></div><p className="mt-1 text-sm text-slate-600">{row.actor?.name || 'Sistem'} · {row.auditable_type?.split('\\').pop() || 'Aktivitas'} #{row.auditable_id || '-'}</p></article>)}{rows.length === 0 && <p className="rounded-xl bg-white p-10 text-center text-slate-500">Belum ada log audit.</p>}</div>}</Shell>;
}

export function OrganizationSettingsPage() {
    const [config,setConfig]=useState({branding:{},employee_menu:[],dropdowns:{}}); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
    useEffect(()=>{api.get('/app-config').then(r=>setConfig(r.data.data)).finally(()=>setLoading(false));},[]);
    const save=async()=>{setSaving(true);try{await api.put('/admin/app-config',config);alert('Pengaturan perusahaan berhasil disimpan.');}finally{setSaving(false);}};
    if(loading)return <Loading/>;
    return <Shell icon={Settings2} title="Pengaturan Perusahaan" subtitle="Kelola identitas portal dan daftar referensi organisasi."><div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><label className="block text-sm font-semibold">Nama portal<input className="mt-2 w-full rounded-xl border border-slate-200 p-3" value={config.branding?.portal_name||''} onChange={e=>setConfig({...config,branding:{...config.branding,portal_name:e.target.value}})}/></label><label className="block text-sm font-semibold">URL gambar hero<input className="mt-2 w-full rounded-xl border border-slate-200 p-3" value={config.branding?.hero_image_url||''} onChange={e=>setConfig({...config,branding:{...config.branding,hero_image_url:e.target.value}})}/></label><div className="grid gap-4 md:grid-cols-3">{['departments','positions','banks'].map(key=><label key={key} className="text-sm font-semibold capitalize">{key}<textarea rows="5" className="mt-2 w-full rounded-xl border border-slate-200 p-3" value={(config.dropdowns?.[key]||[]).join(', ')} onChange={e=>setConfig({...config,dropdowns:{...config.dropdowns,[key]:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}})}/></label>)}</div><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"><Save size={18}/>{saving?'Menyimpan…':'Simpan'}</button></div></Shell>;
}

export function SystemSettingsPage() {
    const [config,setConfig]=useState({employee_menu:[]}); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
    useEffect(()=>{api.get('/app-config').then(r=>setConfig(r.data.data)).finally(()=>setLoading(false));},[]);
    const save=async()=>{setSaving(true);try{await api.put('/admin/app-config',config);alert('Akses menu berhasil disimpan.');}finally{setSaving(false);}};
    return <Shell icon={Settings2} title="Pengaturan Sistem" subtitle="Atur nama dan ketersediaan fitur pada website serta aplikasi mobile karyawan.">{loading?<Loading/>:<div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="grid gap-3 md:grid-cols-2">{(config.employee_menu||[]).map((item,index)=><label key={item.key} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><input className="flex-1 rounded-lg border border-slate-200 p-2" value={item.label} onChange={e=>setConfig({...config,employee_menu:config.employee_menu.map((x,i)=>i===index?{...x,label:e.target.value}:x)})}/><input type="checkbox" checked={item.enabled} onChange={e=>setConfig({...config,employee_menu:config.employee_menu.map((x,i)=>i===index?{...x,enabled:e.target.checked}:x)})}/></label>)}</div><button onClick={save} disabled={saving} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white">{saving?'Menyimpan…':'Simpan akses menu'}</button></div>}</Shell>;
}

export function PayrollConfigPage() {
    return <Shell icon={Settings2} title="Konfigurasi Payroll" subtitle="Pengaturan komponen perhitungan gaji, terpisah dari proses payroll bulanan."><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><b>Konfigurasi komponen gaji dikelola pada modul Payroll Components.</b><p className="mt-2 text-sm">Halaman ini sengaja tidak menjalankan payroll. Proses periode bulanan tetap berada pada menu Payroll.</p></div></Shell>;
}
