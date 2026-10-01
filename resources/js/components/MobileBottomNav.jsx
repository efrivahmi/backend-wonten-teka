import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Banknote, CalendarCheck, CalendarDays, LayoutDashboard, Menu, Users, CheckSquare } from 'lucide-react';

const config = {
    employee: [
        { label: 'Beranda', to: '/employee/dashboard', icon: LayoutDashboard },
        { label: 'Jadwal', to: '/employee/shifts', icon: CalendarDays },
        { label: 'Absen', to: '/employee/attendance', icon: CalendarCheck, primary: true },
        { label: 'Gaji', to: '/employee/payslip', icon: Banknote },
    ],
    admin: [
        { label: 'Beranda', to: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Karyawan', to: '/admin/employees', icon: Users },
        { label: 'Absensi', to: '/admin/attendance-daily', icon: CalendarCheck, primary: true },
        { label: 'Persetujuan', to: '/admin/approvals', icon: CheckSquare },
    ],
};

export default function MobileBottomNav({ role, onMenu }) {
    const { pathname } = useLocation();
    const items = config[role] || config.employee;

    return <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="relative mx-auto max-w-xl">
            <div className="grid h-[4.25rem] grid-cols-5 items-center rounded-2xl border border-white/80 bg-white/90 shadow-[0_-8px_30px_rgba(15,60,42,.12)] backdrop-blur-xl">
                {items.slice(0, 2).map(item => <NavItem key={item.to} item={item} pathname={pathname} />)}
                <span aria-hidden="true" />
                {items.slice(3).map(item => <NavItem key={item.to} item={item} pathname={pathname} />)}
                <button type="button" onClick={onMenu} aria-label="Buka semua menu" className="flex h-full flex-col items-center justify-center gap-1 text-slate-500 transition hover:text-emerald-800 focus-visible:outline-emerald-700">
                    <Menu className="h-5 w-5" strokeWidth={2} /><span className="text-[10px] font-semibold">Menu</span>
                </button>
            </div>
            <Link to={items[2].to} aria-label="Buka halaman absensi" aria-current={pathname.startsWith(items[2].to) ? 'page' : undefined} className="group absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[1.05rem] flex-col items-center focus-visible:outline-none">
                <span className="grid h-[3.6rem] w-[3.6rem] place-items-center rounded-full border-[5px] border-[var(--teka-canvas)] bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-800 text-white shadow-[0_8px_22px_rgba(5,110,72,.34)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_12px_26px_rgba(5,110,72,.4)] group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-emerald-300">
                    <CalendarCheck className="h-6 w-6" strokeWidth={2.5} />
                </span>
                <span className="mt-0.5 text-[10px] font-bold text-emerald-800">{items[2].label}</span>
            </Link>
        </div>
    </nav>;
}

function NavItem({ item, pathname }) {
    const active = pathname.startsWith(item.to);
    const Icon = item.icon;
    return <Link to={item.to} aria-current={active ? 'page' : undefined} className={`flex h-full flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-emerald-700 ${active ? 'text-emerald-700' : 'text-slate-500 hover:text-emerald-800'}`}>
        <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} /><span className="text-[10px] font-semibold">{item.label}</span>
    </Link>;
}
