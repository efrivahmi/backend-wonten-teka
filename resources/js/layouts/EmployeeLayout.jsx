import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    CalendarCheck, 
    Briefcase, 
    Clock, 
    FileText,
    LogOut,
    Menu,
    X,
    User,
    Bell,
    CalendarDays,
    ClipboardList,
    Plane,
    SlidersHorizontal,
    ChevronDown
} from 'lucide-react';
import api from '../api';
import { getDeviceFingerprint } from '../deviceIdentity';
import BrandLogo from '../components/BrandLogo';

const EmployeeLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktopMenuClosed, setIsDesktopMenuClosed] = useState(false);
    const [menuConfig, setMenuConfig] = useState([]);
    const [openMenus, setOpenMenus] = useState({ 'Informasi & Aktivitas': true, Presensi: true });
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    useEffect(() => {
        api.get('/app-config').then(response => setMenuConfig(response.data.data?.employee_menu || [])).catch(() => setMenuConfig([]));
        api.get('/me').then(response => {
            const freshUser = response.data.user || {};
            localStorage.setItem('user', JSON.stringify(freshUser));
            setUser(freshUser);
        }).catch(() => {});
    }, []);

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

    const menuDefinitions = {
        attendance: { name: 'Absensi', href: '/employee/attendance', icon: CalendarCheck },
        schedule: { name: 'Jadwal & Shift', href: '/employee/shifts', icon: CalendarDays },
        leave: { name: 'Cuti', href: '/employee/leave', icon: Briefcase },
        overtime: { name: 'Lembur', href: '/employee/overtime', icon: Clock },
        claims: { name: 'Klaim/Reimburse', href: '/employee/claims', icon: FileText },
        payroll: { name: 'Slip Gaji', href: '/employee/payslip', icon: FileText },
        calendar: { name: 'Kalender', href: '/employee/calendar', icon: CalendarDays },
        tasks: { name: 'Tugas Pribadi', href: '/employee/tasks', icon: ClipboardList },
        habits: { name: 'Habit Tracker', href: '/employee/habits', icon: CalendarCheck },
        adjustments: { name: 'Ajukan Koreksi Absensi', href: '/employee/attendance-adjustments', icon: SlidersHorizontal },
        business_trips: { name: 'Perjalanan Dinas', href: '/employee/business-trips', icon: Plane },
        notifications: { name: 'Notifikasi', href: '/employee/notifications', icon: Bell },
        biometric: { name: 'Data Wajah Saya', href: '/employee/face-profile', icon: User },
    };
    const configuredItem = (key) => {
        const definition = menuDefinitions[key];
        const configured = menuConfig.find(item => item.key === key);
        if (!definition || (key !== 'biometric' && configured?.enabled === false)) return null;
        return { ...definition, name: key === 'biometric' ? definition.name : (configured?.label || definition.name) };
    };
    const items = (keys) => keys.map(configuredItem).filter(Boolean);
    const navigation = [
        { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
        { name: 'Presensi', icon: CalendarCheck, children: items(['attendance', 'schedule', 'business_trips']) },
        { name: 'Pengajuan', icon: Briefcase, children: items(['leave', 'overtime', 'claims', 'adjustments']) },
        { name: 'Informasi & Aktivitas', icon: Bell, children: items(['calendar', 'tasks', 'habits', 'notifications']) },
        { name: 'Keuangan', icon: FileText, children: items(['payroll']) },
        configuredItem('profile') ? { name: configuredItem('profile').name, href: '/employee/profile', icon: User } : null,
        {
            name: 'Biometrik',
            icon: User,
            children: [
                configuredItem('biometric'),
                { name: 'Rekam Ulang Wajah', href: '/employee/face-enrollment', icon: CalendarCheck },
            ].filter(Boolean),
        },
    ].filter(item => item && (!item.children || item.children.length > 0));

    const toggleMenu = (name) => setOpenMenus(previous => ({ ...previous, [name]: !previous[name] }));

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
        <div className="teka-shell flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div className={`teka-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-1.5rem))] flex-col overflow-hidden bg-white shadow-xl transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${!isDesktopMenuClosed ? 'md:translate-x-0' : 'md:-translate-x-full'} md:w-64 transition-transform duration-300 ease-in-out`}>
                <div className="flex h-20 flex-shrink-0 items-center justify-between px-5 border-b border-slate-100">
                    <div className="flex min-w-0 items-center gap-3"><BrandLogo className="h-11 w-11 shrink-0"/><span className="min-w-0 text-sm font-extrabold leading-tight text-emerald-900">e-Absensi<br/><span className="text-[11px] font-semibold text-slate-500">Lemdiklat Taruna Nusantara Indonesia</span></span></div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <nav className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-2 pb-6">
                    {navigation.map((item) => {
                        if (item.children) {
                            const isChildActive = item.children.some(child => location.pathname.startsWith(child.href));
                            const isOpen = openMenus[item.name] ?? isChildActive;
                            return <div key={item.name} className="space-y-1">
                                <button onClick={() => toggleMenu(item.name)} className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg transition-colors ${isChildActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <div className="flex min-w-0 items-center space-x-3 text-left"><item.icon className="h-5 w-5 flex-shrink-0" /><span className="text-sm font-medium leading-tight">{item.name}</span></div>
                                    <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && <div className="pl-10 pr-1 py-1 space-y-1">{item.children.map(child => {
                                    const isActive = location.pathname.startsWith(child.href);
                                    return <Link key={child.href} to={child.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-start space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-lime-50 text-emerald-700 font-medium' : 'text-slate-500 hover:text-emerald-700'}`}><child.icon className="mt-0.5 h-4 w-4 flex-shrink-0" /><span className="text-sm leading-snug">{child.name}</span></Link>;
                                })}</div>}
                            </div>;
                        }
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    isActive 
                                    ? 'bg-emerald-50 text-emerald-700 font-medium' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
                                }`}
                            >
                                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span className="text-sm truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

            </div>

            {/* Main Content */}
            <div className={`teka-shell flex-1 flex flex-col h-screen overflow-hidden relative z-0 transition-all duration-300 ease-in-out ${!isDesktopMenuClosed ? 'md:ml-64' : 'md:ml-0'}`}>
                <header className="teka-topbar border-b h-16 flex items-center px-4 md:px-8 justify-between z-10 flex-shrink-0 bg-white">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 hover:text-slate-800 p-2">
                            <Menu className="h-6 w-6" />
                        </button>
                        <button onClick={() => setIsDesktopMenuClosed(!isDesktopMenuClosed)} className="hidden md:flex text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition items-center justify-center">
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>
                    
                    <div className="flex items-center space-x-4 ml-auto">
                        <Link to="/employee/notifications" className="text-slate-400 hover:text-emerald-600 transition-colors p-2">
                            <Bell className="h-5 w-5" />
                        </Link>
                        <div className="relative">
                            <button onClick={() => setProfileOpen(value => !value)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:border-emerald-300">
                                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><User className="h-4 w-4" /></span>
                                <span className="hidden sm:block max-w-40"><span className="block truncate text-sm font-semibold text-slate-800">{user.employee?.full_name || user.name || 'Karyawan'}</span><span className="block truncate text-[11px] text-slate-500">Profil saya</span></span>
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            </button>
                            {profileOpen && <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                <Link to="/employee/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50"><User className="h-4 w-4" />Lihat & edit profil</Link>
                                <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Keluar</button>
                            </div>}
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

export default EmployeeLayout;
