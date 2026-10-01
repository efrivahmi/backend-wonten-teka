export const attendanceToneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

const statusMeta = {
    on_time: { label: 'Tepat waktu', tone: 'emerald' },
    present: { label: 'Tepat waktu', tone: 'emerald' },
    late: { label: 'Terlambat', tone: 'amber' },
    absent: { label: 'Alpha / Tidak masuk', tone: 'rose' },
    incomplete: { label: 'Belum check-out', tone: 'amber' },
    not_started: { label: 'Belum absen', tone: 'slate' },
};

export const getAttendanceStatusMeta = (attendance) => {
    const status = attendance?.status || (attendance?.check_in_time
        ? (attendance?.check_out_time ? 'on_time' : 'incomplete')
        : 'not_started');

    return statusMeta[status] || { label: status.replaceAll('_', ' '), tone: 'slate' };
};
