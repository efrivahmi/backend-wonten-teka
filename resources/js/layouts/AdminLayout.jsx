import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    CheckSquare, 
    Users, 
    CalendarRange,
    FileBarChart,
    LogOut,
    Menu,
    X,
    Shield,
    Bell,
    MapPin,
    CalendarCheck,
    ChevronDown,
    CalendarDays,
    Banknote,
    ListChecks,
    Smartphone,
    Flag,
    Briefcase
} from 'lucide-react';
import api from '../api';
import { getDeviceFingerprint } from '../deviceIdentity';
import BrandLogo from '../components/BrandLogo';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState({ Presensi: true });
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Bounce-out mechanism if device is revoked/rejected while logged in
    useEffect(() => {
        // Skip for super admin
        if (user && user.is_super_admin) return;

        let intervalId;
        const checkDeviceValidity = async () => {
            try {
                const fingerprint = await getDeviceFingerprint();
                const response = await api.get('/device/status', {
                    params: { device_fingerprint: fingerprint }
                });

                if (!response.data.device || response.data.device.status !== 'active') {
                    // Device revoked or not active anymore
                    clearInterval(intervalId);
                    navigate('/onboarding/device');
                }
            } catch (err) {
                if (err.response?.status === 404) {
                    // Device completely deleted from DB
                    clearInterval(intervalId);
                    navigate('/onboarding/device');
                }
            }
        };

        checkDeviceValidity(); // Initial check
        intervalId = setInterval(checkDeviceValidity, 15000); // Check every 15s

        return () => clearInterval(intervalId);
    }, [navigate, user]);

    const toggleMenu = (name) => {
        setOpenMenus(prev => ({...prev, [name]: !prev[name]}));
    };

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        {
            name: 'SDM & Persetujuan',
            icon: Users,
            children: [
                { name: 'Karyawan', href: '/admin/employees', icon: Users },
                { name: 'Persetujuan', href: '/admin/approvals', icon: CheckSquare },
                { name: 'Klaim / Reimburse', href: '/admin/claims', icon: FileBarChart },
                { name: 'Jenis Klaim', href: '/admin/claim-categories', icon: Banknote },
                { name: 'Jenis Cuti', href: '/admin/leave-types', icon: Briefcase },
            ],
        },
        { 
            name: 'Presensi',
            icon: CalendarCheck, 
            children: [
                { name: 'Jadwal & Shift', href: '/admin/schedule', icon: CalendarRange },
                { name: 'Penugasan Shift', href: '/admin/shift-assignments', icon: CalendarRange },
                { name: 'Lokasi Absensi', href: '/admin/attendance-settings', icon: MapPin },
                { name: 'Kehadiran Harian', href: '/admin/attendance-daily', icon: CalendarCheck },
                { name: 'Laporan Absensi', href: '/admin/reports', icon: FileBarChart },
                { name: 'Deteksi Fake GPS', href: '/admin/attendance-security-events', icon: Flag },
            ],
        },
        {
            name: 'Operasional',
            icon: ListChecks,
            children: [
                { name: 'Perangkat', href: '/admin/devices', icon: Smartphone },
                { name: 'Event', href: '/admin/events', icon: CalendarDays },
                { name: 'Pengumuman', href: '/admin/announcements', icon: Bell },
                { name: 'Daily Task & Habit', href: '/admin/tasks', icon: ListChecks },
                { name: 'Payroll', href: '/admin/payroll', icon: Banknote },
                { name: 'Konfigurasi Payroll', href: '/admin/payroll-config', icon: Banknote },
                { name: 'Biometrik Wajah', href: '/admin/biometrics', icon: Shield },
                { name: 'Analitik Departemen', href: '/admin/department-analytics', icon: FileBarChart },
                { name: 'Pusat Ekspor', href: '/admin/export', icon: FileBarChart },
                { name: 'Log Audit', href: '/admin/audit-logs', icon: Shield },
                { name: 'Pengaturan Perusahaan', href: '/admin/org-settings', icon: MapPin },
                { name: 'Pengaturan Sistem', href: '/admin/settings', icon: Shield },
            ]
        },
        { name: 'Profil Administrator', href: '/admin/profile', icon: Shield },
    ];

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <div className="teka-shell flex h-screen">
            {/* Sidebar */}
            <div className={`teka-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-1.5rem))] flex-col overflow-hidden shadow-xl transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:w-64 md:translate-x-0 transition-transform duration-300 ease-in-out`}>
                <div className="flex h-20 flex-shrink-0 items-center justify-between px-5 border-b border-slate-100">
                    <div className="flex min-w-0 items-center gap-3"><BrandLogo className="h-11 w-11 shrink-0"/><span className="min-w-0 text-sm font-extrabold leading-tight text-emerald-900">e-Absensi<br/><span className="text-[11px] font-semibold text-slate-500">Lemdiklat Taruna Nusantara Indonesia</span></span></div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-green-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <nav className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-2 pb-6">
                    {navigation.map((item) => {
                        if (item.children) {
                            const isChildActive = item.children.some(child => location.pathname.startsWith(child.href));
                            const isOpen = openMenus[item.name] ?? isChildActive;
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => toggleMenu(item.name)}
                                        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg transition-colors ${
                                            isChildActive && !isOpen
                                            ? 'bg-green-50 text-green-800'
                                            : 'text-slate-600 hover:bg-lime-50 hover:text-green-800'
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center space-x-3 text-left">
                                            <item.icon className={`h-5 w-5 flex-shrink-0 ${isChildActive ? 'text-green-700' : ''}`} />
                                            <span className={`font-medium text-sm leading-tight ${isChildActive ? 'text-green-800' : ''}`}>{item.name}</span>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isOpen && (
                                        <div className="pl-11 pr-2 py-1 space-y-1">
                                            {item.children.map(child => {
                                                const isActive = location.pathname.startsWith(child.href);
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        to={child.href}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`flex items-start space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                                            isActive 
                                                            ? 'bg-lime-50 text-green-700'
                                                            : 'text-slate-500 hover:text-green-700'
                                                        }`}
                                                    >
                                                        <child.icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                                        <span className="font-medium text-sm leading-snug">{child.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    isActive 
                                    ? 'bg-green-700 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-lime-50 hover:text-green-800'
                                }`}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                <span className="font-medium text-sm truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

            </div>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden bg-slate-50 relative z-0">
                <header className="teka-topbar border-b h-16 flex items-center px-4 md:px-8 justify-between z-10 flex-shrink-0">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 hover:text-slate-800 p-2">
                        <Menu className="h-6 w-6" />
                    </button>
                    
                    <div className="flex items-center space-x-4 ml-auto">
                        <button className="text-slate-400 hover:text-emerald-600 transition-colors p-2">
                            <Bell className="h-5 w-5" />
                        </button>
                        <div className="relative">
                            <button onClick={() => setProfileOpen(value => !value)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 hover:border-emerald-300"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Shield className="h-4 w-4" /></span><span className="hidden max-w-40 text-left sm:block"><span className="block truncate text-sm font-semibold text-slate-800">{user.name || 'Administrator'}</span><span className="block text-[11px] text-slate-500">Profil admin</span></span><ChevronDown className="h-4 w-4 text-slate-400" /></button>
                            {profileOpen && <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><div className="px-4 py-3"><p className="truncate text-sm font-semibold text-slate-800">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div><Link to="/admin/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50"><Shield className="h-4 w-4"/>Edit profil</Link><button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Keluar</button></div>}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto w-full">
                    <Outlet />
                </main>
            </div>
            
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;
